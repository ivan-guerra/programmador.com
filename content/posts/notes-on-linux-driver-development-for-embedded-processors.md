---
title: "Notes On \"Linux Driver Development for Embedded Processors\""
date: 2024-02-15T21:16:49-08:00
description: "My collection of notes on Rio's \"Linux Driver Development for
Embedded Processors\"."
tags: ["c", "c++", "linux", "notes"]
---

This is the second [installment][1] in a series of posts where I share the notes
I've taken while reading an interesting book or article.

This post includes the notes I made while reading ["Linux Driver Development for
Embedded Processors"][1] by Alberto Liberal de los Rios. I did not take notes
for every chapter so keep in mind that the book actually covers quite a few more
topics than what's shown here.

I also previously posted a review[^1] so check that out if you're considering
buying the book.

## Character Drivers

* There are three primary ways of creating a character driver:
    * Statically create the device.
    * Use the devtmpfs approach with `create_class()`/`create_device()`.
    * Use the misc framework.
* Block and character drivers have both a major and minor number.
* The major number is used to map a device to a driver. Every driver has a major
  number assigned to it.
* A driver can have one or more minor numbers. The minor numbers' meaning is
  managed by the driver implementation.
* You can edit the `/linux/drivers/char/[Makefile|KConfig]` to add an entry for
  loading your custom char driver.
* Statically assigning major numbers is frowned upon. Prefer to use the devtmpfs
  method instead. devtmpfs is a virtual filesystem that can be mounted to
  `/dev`. Basically, using the `create_class()`/`create_device()` methods, your
  driver will automatically have an entry in `/dev`. Requires
  `CONFIG_DEVTMPFS_MOUNT` be enabled in the kernel config. Note, the latter
  option does not work if booting using an initramfs.
* Major numbers are limited and it wastes RAM to keep them around. If you have a
  simple char device, it is preferable to use the misc framework. All misc
  devices have a major of 10 but the minor can be dynamically or statically
  assigned. This approach is good for devices with just one minor (they do
  something basic). 
* sysfs is another virtual filesystem mounted to `/sys`. sysfs has a structure
  and contents that describe the hardware onboard the system. Device classes
  including those created using devtmpfs `create*` calls can be viewed under
  `/sys/class`.
* udev is a userspace daemon that listens for uevents and makes use of the info
  in sysfs. Admins can configure udev rules to name devices, setup symlinks,
  react to certain events (e.g., device plugin) etc.
* ["What Populates the sys and dev Directories"][4].

## Platform Drivers

* Platform drivers are drivers that are bound to devices defined in the device
  tree (DT).
* Platform drivers are tied to their device node in the DT using the compatible
  string. The driver sets up the compatible string using `struct of_device_id`
  and the `MODULE_DEVICE_TABLE` macro.
* Linux a has a core platform driver subsystem which will scan the DT and bind a
  device to the driver using the compatible string. On binding, the platform
  driver ops will be triggered. Specifically `probe()` on initialization and
  `remove()` on exit.
* `probe()` performs the following functions:
  * Gets a pointer to a device structure as an argument (e.g., `struct pci_dev
    *`, `struct usb_dev *`, `struct platform_device *`, `struct i2c_client *`,
    etc.).
  * Initializes the device, maps I/O memory, allocates buffers, registers
    interrupt handlers, timers, and so on.
  * It registers the device to a specific framework(s) (e.g., network, misc,
    serial, input, industrial).
* Many pins are multifunction and can be multiplexed to one of these functions.
  The pins may also be configured seperately.
* Linux has a pinctrl subsystem for which board developers write pinctrl drivers
  specific to their hardware. Look at the kernel docs under
  `linux/Documentation/devicetree/bindings/pinctrl/brcm,bcm2835-gpio.txt` if you
  feel you need more info.
* Linux has a GPIO controller driver as well. An API is exposed for accessing
  and configuring GPIO pins called the GPIO descriptor consumer interface.
* GPIOs can easily be mapped to devices and functions in the device tree. The
  exact way to do it depends on the GPIO controller providing the GPIOs (see the
  device tree bindings for your controller). Reference page 143.
* GPIOs can be mapped to IRQs in the DT and then a driver can access that GPIO
  IRQ number to register interrupts on that IRQ.
* The UIO framework can be used to implement the core of a driver from
  userspace. Below is summary of the pros/cons of a UIO driver:
  * Pros:
    * Easy to debug as debug tools are more readily available for application
      development.
    * User space services such as floating point are available.
    * Device access is very efficient as there is no system call required.
    * The application API of Linux is very stable.
    * The driver can be written in any language, not just C.
  * Cons:
    * No access to the kernel frameworks and services.
    * Interrupt handling cannot be done in user space. It must be handled by a
      kernel driver.
    * There is no predefined API to allow applications to access the device
      driver.
* Below is a summary of the pros/cons of kernel space drivers:
  * Pros:
    * Runs in kernel space in the highest privilege mode to allow access to
      interrupts and hardware resources.
    * There are a lot of kernel services such that kernel space drivers can be
      designed for complex devices.
    * The kernel provides an API to user space which allows multiple
      applications to access a kernel space driver simultaneously.
  * Cons:
    * System call overhead to access drivers.
    * Challenging to debug.
    * Frequent kernel API changes. Kernel drivers built for one kernel version
      may not build for another.
* You can either use the generic UIO driver specified as "uio-generic" in the DT
  or write a custom platform driver that plugs into the UIO framework.
* UIO is especially handy for mapping device memory straight into the userpace
  and letting userspace do what it will with the device.
* Interrupt handling is a bit weird. Userspace cannot register or handle
  interrupts. The UIO driver must handle the interrupt. A userspace app can
  block waiting for an interrupt using read() or select(). 
* If you use the generic-uio driver you must also set the kernel boot arg
  `uio_pdrv_genirq.of_id=generic-uio`. The generic driver will magically map the
  `reg` field of the DT into memory so that your userspace app can access that
  memory using `mmap()`.

## I2C Devices 

* There are three entities to consider: The I2C Bus, I2C Controller, and I2C
  Client.
  * The I2C Bus is a kernel framework for registering I2C controllers and
    provides an API that a I2C client can use to tx/rx data using the specific
    controller for that system.
  * The I2C Controller must define a transfer function that will be used as a
    callback by the I2C bus driver. The I2C controller implements the details of
    the I2C controller onboard the SoM.
  * The I2C client is a driver for a specific I2C device. Think accelerometers,
    ADCs etc. It uses the I2C Bus API to tx/rx data.

## Interrupts

* GPIOs can be leveraged as interrupt pins. The GPIOs and interrupt controller
  must be configured as such in the DT. The "interrupt" property is used to
  define a GPIO interrupt.
* Interrupts are split into a time-critical top half that runs in interrupt
  context and an optional bottom half which runs at some later time in process
  context. The bottom half does the heavy lifting.
* To achieve the interrupt split, deferred work is used. This takes many forms:
  * Threaded IRQs
  * Tasklets
  * Workqueues
* Tasklets may only run on a single CPU concurrently. Tasklets execute in an
  interrupt context so no blocking/sleeping is allowed. 
* A typical flow in the kernel is ALL ISRs -> ALL TASKLETS -> Process Threads
  (both kernel and user)
* ISRs run at essentially infinite prority and mask the interrupt they are
  servicing. You want ISRs not to block or sleep for that reason. 
* Tasklets are built on top of softirqs. If there are too many softrirqs or
  softirq processing is taking to long, the kernel will create `ksoftirqd/N`
  threads to schedule the processing of the softirqs.
* Threaded IRQs are means of specifying both a top half and bottom half routine
  for interrupt handling. The top half runs in interrupt context, the bottom
  half runs as a kernel thread in process context.
* Workqueues allow you to add work to a global "events" workqueue maintained by
  the kernel. From the ISR, you can schedule work (i.e., kickoff a thread to
  service the interrupt data at some later time).
* You can also spawn your own kthreads though this is discouraged.
* Timers are an option for drivers. Timers are implemented using the softirq
  system. You register a timer ISR with your timer and then set it.
  Subsequently, your timer ISR gets called on timer expiration, there you can do
  some work and schedule another timer. Timer expirations are set using jiffies.
* A jiffy is a time value that starts from 0 on boot and increments by 1 every
  system timer tick. The "jiffies" macro is accessible globally. You can use the
  `HZ` macro (which is tied to `CONFIG_HZ`) to convert jiffies to time or vice
  versa. There's also plenty of helper macros in the kernel that do said
  conversion.
* Waitqueues are a means of deferring work as well. You setup a waitqueue with
  some function registered. From within an ISR or elsewhere in the driver code,
  you can kick off the work waiting in the queue. The work will be scheduled at
  some later time by the scheduler and will execute in process context. There
  are two types of waitqueues: interruptible and non-interruptible.
  Interruptible means that a signal can wake the thread. Waitqueues also have an
  option for setting expiry timers.


[1]: https://programmador.com/tags/notes/ 
[2]: https://www.amazon.com/Linux-Driver-Development-Embedded-Processors/dp/1729321828
[3]: https://programmador.com/posts/linux-driver-development-for-embedded-processors/
[4]: https://unix.stackexchange.com/questions/715801/what-populates-the-sys-and-dev-directories

[^1]: ["Linux Driver Development for Embedded Processors"][3]
