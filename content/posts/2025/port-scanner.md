---
title: "Port Scanning"
date: 2025-01-21T22:43:50-05:00
description: "TCP/UDP port scanning in Rust."
categories: ["projects"]
tags: ["cli-tools", "rust"]
---

Port scanning is the name given to the process of discovering open ports on a
remote host. In this article, you'll explore the design and implementation of a
basic port scanner written in Rust.

## Starting with a Ping

Utilities with port scanning capabilities often start by sending a ping to the
target. For example, [nmap][1] pings the target before scanning. This ensures
the target is reachable.

To send a ping or an ICMP packet, you need to create a raw socket which requires
the `CAP_NET_RAW` capability. A regular user doesn't have `CAP_NET_RAW`
capability meaning a ping requires `sudo` or elevated privileges. Luckily,
modern Linux provides unpriviledged ping. The unpriviledged ping uses a `dgram`
socket rather than a `raw` socket.

In Rust, the [`ping-rs`][2] crate provides an interface for sending pings using
the unpriviledged method:

```rust
fn ping_host(addr: &IpAddr) -> PingApiOutput {
    let data = [0; 4];
    let timeout = Duration::from_secs(1);
    let options = ping_rs::PingOptions {
        ttl: 128,
        dont_fragment: true,
    };
    ping_rs::send_ping(addr, timeout, &data, Some(&options))
}

fn main() {
    match ping_host(&addr) {
        Ok(reply) => println!("Host is up ({}ms latency).", reply.rtt),
        Err(e) => return Err(format!("Host is unreachable, {:?}", e).into()),
    }
}
```

With these few lines of code, you're able to check for connectivity. With
connectivity established, you can proceed with port scanning.

## Port Scanning Techniques

There's a number of different approaches to port scanning. Which technique you
select depends on the protocol you're targeting and the level of stealth you
want to maintain:

- **TCP Connect Scan**: This is the most common type of port scan. It involves
  attempting to establish a full TCP connection with the target port. If you
  successfully establish the connection, the port is open. If the target refuses
  the connection, the port's closed.
- **TCP Half Connect**: This is a stealthier version of the TCP Connect Scan. It
  involves sending a SYN packet to the target port. If the port is open, the
  target will respond with a SYN-ACK packet. If the port's closed, the target
  will respond with a RST packet.
- **UDP Connect**: This involves sending a UDP packet to the target port. If the
  target replies with any data, the port's open. If the target responds with an
  ICMP port unreachable message, the port's closed.

This article's port scanner uses the TCP and UDP Connect techniques. Lets
examine each technique and its code. Note, error handling isn't shown in the
snippets below. You can find the full source [here][3].

Lets start with the TCP Connect Scan:

```rust
/// Attempts to establish a TCP connection to the specified address and determines the port state.
fn check_tcp_connection<A: ToSocketAddrs>(addr: A, timeout_ms: u64) -> Option<PortState> {
    let target = addr
        .to_socket_addrs()
        .expect("Error getting socket addrs")
        .next()
        .unwrap();

    match TcpStream::connect_timeout(&target, Duration::from_millis(timeout_ms)) {
        Ok(_) => Some(PortState::Open),
        Err(e) if e.kind() == std::io::ErrorKind::ConnectionRefused => Some(PortState::Closed),
        Err(_) => Some(PortState::Filtered),
    }
}
```

`check_tcp_connection()` attempts to establish a TCP connection to the target.
If it opens the connection, the port is open. If the target refuses the
connection, the port's closed. Otherwise, you can assume a firewall or some
other network filter is filtering the port. The timeout controls the duration of
the connection attempt. You don't want to attempt to connect and block forever,
hence the timeout. That said, how long should you block? Since you may scan up
to 65535 ports, you don't want the timeout to be too large else the scan will
take too long. Make the timeout too short and you may miss out on open ports.
This parameter should be tunable by the user so that they can decide how
aggressively they want to scan.

Here's the UDP Connect Scan:

```rust
/// Checks the state of a UDP port by sending an empty datagram and analyzing the response.
fn check_udp_port(socket: &UdpSocket, addr: &str) -> Option<PortState> {
    let target_addr = addr
        .to_socket_addrs()
        .expect("Failed to resolve address")
        .next()
        .unwrap();

    socket
        .send_to(&[], target_addr)
        .expect("Failed to send UDP packet");

    let mut buffer = [0u8; 512];
    loop {
        match socket.recv_from(&mut buffer) {
            Ok((_, src_addr)) => {
                // If we receive any data, consider the port Open
                if src_addr.to_string() == addr {
                    return Some(PortState::Open);
                }
            }
            Err(ref e) if e.kind() == io::ErrorKind::WouldBlock => {
                // Timeout reached, port is considered Filtered
                return Some(PortState::Filtered);
            }
            Err(ref e) if e.kind() == io::ErrorKind::ConnectionReset => {
                // ICMP Destination Unreachable received
                return Some(PortState::Closed);
            }
            Err(_) => return None, // Handle other unexpected errors
        }
    }
}
```

`check_udp_port()` is similar to `check_tcp_connection()`. The key difference is
that since UDP is connectionless, you need to analyze the response to determine
the port state. A reply from the target indicates the port is open. An ICMP port
unreachable message indicates the port's closed. If you don't receive a reply,
you can assume the port's filtered by a firewall or some other network filter.

## Scanning in Parallel

Scanning ports sequentially is slow. When using a connection timeout of 25
milliseconds for each port, scanning all 65535 ports could take up to 27
minutes. To speed up the scan, you can scan ports in parallel. The secret is to
chunk the port range based on the number of cores available on the host.

Here's the relevant snippet taken from the UDP scanner:

```rust
/// Performs a UDP port scan on the specified IP address within the given port range.
///
/// The scan is performed using multiple threads (up to 16) to improve performance.
fn scan(
    &self,
    addr: &std::net::IpAddr,
    port_range: &PortRange,
    timeout_ms: u64,
) -> ScanResults {
    let ports: Vec<u16> = (port_range.start..=port_range.end).collect();
    let n_threads = num_cpus::get().min(16);
    let chunk_size = ports.len().div_ceil(n_threads);
    let target = Arc::new(*addr);
    let results = Arc::new(Mutex::new(ScanResults::new()));

    let handles: Vec<_> = ports
        .chunks(chunk_size)
        .enumerate()
        .map(|(i, chunk)| {
            let addr = Arc::clone(&target);
            let results = Arc::clone(&results);
            let ports = chunk.to_vec();

            thread::Builder::new()
                .name(format!("udp-scanner-{}", i))
                .spawn(move || {
                    // Call check_udp_port()
                })
                .expect("Failed to spawn thread")
        })
        .collect();

    for handle in handles {
        if let Err(e) = handle.join() {
            eprintln!("Thread panicked: {:?}", e);
        }
    }

    let mut results = Arc::try_unwrap(results)
        .expect("Failed to unwrap Arc")
        .into_inner()
        .expect("Failed to acquire mutex lock");
    results.sort_by(|a, b| a.port.cmp(&b.port));

    results
}
```

Here are the highlights. `n_threads` uses the `num_cpus` crate to determine the
number of logical cores on the host. The value gets clamped down to a maximum of 16.
`chunk_size` calculates the number of ports each thread will scan. `handles` is
a vector of thread handles. Each handle represents a thread that will scan a
chunk of ports. The program joins all threads and sorts the results by port
number for display.

The speed up achieved by this code is significant. Many cases saw an upwards of
50% reduction in scan time versus a sequential scan.

## Displaying Service Names

One handy feature many port scanners support is the ability to display the
service name associated with a port. For example, one might see the service name
"https" associated with port 80.

The Internet Assigned Numbers Authority (IANA) maintains a list of well-known
port numbers and the services associated with them. You can visit the [IANA
website][4] and browse the port to service mappings.

When printing port numbers and statuses, it's a good idea to include the service
name:

```text
PORT       STATE      SERVICE
22/udp     filtered   ssh
23/udp     filtered   telnet
24/udp     filtered   unknown
25/udp     filtered   smtp
26/udp     filtered   unknown
27/udp     filtered   nsw-fe
28/udp     filtered   unknown
29/udp     filtered   msg-icp
```

## Hostname Resolution

Another useful scanner feature is the ability to resolve hostnames. A user might
not want to enter a raw Ipv4/IPv6 address. Instead, they might want to enter a
hostname such as `gnu.org` or `reddit.com`. Hostname resolution is
straightforward in Rust:

```rust
/// Resolves a hostname to its corresponding IP address.
pub fn resolve_hostname_to_ip(hostname: &str) -> Option<IpAddr> {
    let addr = format!("{}:0", hostname);
    addr.to_socket_addrs()
        .ok()
        .and_then(|mut iter| iter.next()) // Take the first resolved address
        .map(|socket_addr| socket_addr.ip())
}
```

The `to_socket_addrs()` function returns a iterator over the resolved addresses.
The code takes the first address and returns it. Simple as that.

## Conclusion

Port scanning is a useful tool for network administrators and hackers alike. In
this article, you've seen how to implement a basic port scanner in Rust. The
scanner supports both TCP and UDP scanning techniques. It scans ports in
parallel to speed up the process. It displays the service name associated with
each port and resolves hostnames to IP addresses. There's plenty of other
features you could add to this scanner. If you're further interested, checkout
"real-world" scanners like NetCat, Angry IP Scanner, and nmap.

`pscan` implements the ideas discussed in this article. The complete project
source is available on GitHub under [pscan][5].

[1]: https://nmap.org/
[2]: https://crates.io/crates/ping-rs/0.1.2
[3]: https://github.com/ivan-guerra/pscan/tree/master/src/scanners/protocols
[4]: https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml?&page=4
[5]: https://github.com/ivan-guerra/pscan.git
