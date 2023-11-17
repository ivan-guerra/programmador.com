---
title: "Resumes in LaTex"
date: 2023-06-09T09:42:11-07:00
description: "A template and tools for writing a resume in LaTeX."
tags: ["docker", "latex"]
---

Writing a resume can be a time consuming task involving many rounds of
proofreading, recollection, and wordsmithing. Alongside the content, the format
of a resume carries a lot of weight. Like most, the first drafts of my resume
were written using Microsoft Word. As my resume evolved, I found myself fiddling
with a lot of the settings buried deep within Words' menus. It was tedious to
get small deviations in format that applied to one section but not the others.

In college, I came across [LaTeX][1]. LaTeX gave me the fine-grained control I
was searching for in a way that was easier to grok than clicking through a
series of nested menus. Overtime, I developed a LaTeX resume template following
the advice given in Gayle McDowell's ["This Is What a *GOOD* Resume Should Look
Like"][2]. I'd like to share that template as well as the tools and workflow I
use when editing my resume.

# THE TEMPLATE

To be clear, I don't want to advertise this as the golden format. I work in tech
so my resume's target audience is of course tech recruiters. That said, I
believe anyone in STEM can modify this template to suit their particular
audience.

Here's the template in all its glory. Add, remove, and edit as needed in your
text editor or LaTeX IDE:

```latex
\documentclass[10pt,letterpaper]{article}

\usepackage{enumitem}
\usepackage[dvipsnames]{xcolor}
\usepackage[paper=letterpaper,margin=1in]{geometry}
\usepackage{hyperref}
\hypersetup{
    pdfcreator={Ivan Guerra},
    pdfproducer={Ivan Guerra},
    pdftitle={Ivan Eduardo Guerra - Resume},
    pdfauthor={Ivan Guerra},
    pdfsubject={Resume},
    colorlinks=true,
    linkcolor=NavyBlue,
    urlcolor=NavyBlue
}

\begin{document}
\newgeometry{top=0.25in, bottom=0.25in, right=0.4in, left=0.4in}

\hrule
\begin{center}
    \begin{LARGE}
        \textbf{Ivan Eduardo Guerra}
    \end{LARGE}
\end{center}
\hrule

\medskip

\begin{minipage}[t]{0.53\textwidth}
    \begin{flushleft}
        \textbf{Contact Information:}\\
        3344 S Canfield Ave \#207\\
        Los Angeles, CA 90034\\
        Mobile Phone \#: (580) 341-8882\\
        E-mail:
            \href{mailto:ivan.eduardo.guerra@gmail.com}{ivan.eduardo.guerra@gmail.com}
    \end{flushleft}
\end{minipage}
\begin{minipage}[t]{0.44\textwidth}
    \begin{flushright}
        \begin{flushleft}
            \textbf{Social Media:}\\
            Personal Site: \url{www.programmador.com}\\
            GitHub: \url{www.github.com/ivan-guerra}\\
            LinkedIn: \url{www.linkedin.com/in/ivan-guerra}
        \end{flushleft}
    \end{flushright}
\end{minipage}

\medskip

\begin{large}
    \textbf{Professional Experience}
\end{large}

\smallskip \hrule \smallskip

\begin{minipage}[t]{0.53\textwidth}
    \begin{flushleft}
        \textbf{Northrop Grumman - Aeronautics Systems}\\
        \textbf{\textit{Principal Embedded Software Eng. (Active DoD Secret)}}\\
    \end{flushleft}
\end{minipage}
\begin{minipage}[t]{0.44\textwidth}
    \begin{flushright}
        \textbf{September 2019 - Present}
    \end{flushright}
\end{minipage}

\begin{itemize}[noitemsep,topsep=0pt]
    \setlength\itemsep{0.2em}
    \item Successfully led a team of four in the development of an Engine
          Control Unit (ECU) for an Unmanned Air Vehicle.
    \item Implemented a scalable Cross Channel Data Link on RTLinux providing
          redundancy on a number of vehicle sensor inputs.
    \item Created Linux and Windows device drivers for a variety of sensors
          including IMUs, air data computers, and motor controllers.
    \item Redesigned the codebase build system to use CMake allowing for
          cross-platform build and test of product source code.
    \item Reduced the time to deploy on new hardware by using Docker to
          containerize common application code.
\end{itemize}

\medskip

\begin{minipage}[t]{0.53\textwidth}
    \begin{flushleft}
        \textbf{Raytheon - Space and Airborne Systems}\\
        \textbf{\textit{Software Engineer II}}\\
    \end{flushleft}
\end{minipage}
\begin{minipage}[t]{0.44\textwidth}
    \begin{flushright}
        \textbf{June 2017 - September 2019}
    \end{flushright}
\end{minipage}

\begin{itemize}[noitemsep,topsep=0pt]
    \setlength\itemsep{0.2em}
    \item Implemented an air vehicle software instrumentation API in C++
          that allowed the replay of software events post flight.
    \item Improved laser deconfliction system by implementing SAT location
          caching. The average time to detect an unwanted laser intersection
          with a satellite improved by an order of magnitude.
    \item Built a Jenkins CI pipeline to isolate faults and give developers
          early feedback on code changes.
\end{itemize}

\medskip

\begin{minipage}[t]{0.53\textwidth}
    \begin{flushleft}
        \textbf{ExxonMobil - Data and Information Systems}\\
        \textbf{\textit{Intern Applications Engineer}}\\
    \end{flushleft}
\end{minipage}
\begin{minipage}[t]{0.44\textwidth}
    \begin{flushright}
        \textbf{May 2016 - August 2016}
    \end{flushright}
\end{minipage}

\begin{itemize}[noitemsep,topsep=0pt]
    \setlength\itemsep{0.2em}
    \item Created a tool for automatically generating optimal chemical cargo
          configurations.
    \item Reduced the probability of chemical payload contamination by
          implementing a cargo management UI to control cargo allocation
          across multiple vessels.

\end{itemize}

\medskip

\begin{large}
    \textbf{Education}
\end{large}

\smallskip \hrule \smallskip

\begin{minipage}[t]{0.5\textwidth}
    \begin{flushleft}
        \textbf{University of Oklahoma: Norman, OK}\\

    \end{flushleft}
\end{minipage}
\begin{minipage}[t]{0.47\textwidth}
    \begin{flushright}
        \textbf{Fall 2013 - Spring 2017}

    \end{flushright}
\end{minipage}
\begin{itemize}[topsep=0pt]
    \setlength\itemsep{0.2em}
    \item B.S.E. in Computer Science with minors in Mathematics and Spanish;
          Overall GPA: \textbf{3.95}/{4.00}
    \item Graduate Coursework: Algorithms;
                               Advanced Databases;
                               Computational Complexity;
                               Cryptography;
                               Discrete Optimization
\end{itemize}

\medskip

\begin{large}
    \textbf{Technical Projects}
\end{large}

\smallskip \hrule \smallskip

\begin{itemize}[topsep=0pt]
    \setlength\itemsep{0.2em}
    \item \textbf{Gsync} (2023). GPIO driven synchronization on a real-time
                                 Linux system. C/C++, Bash
    \item \textbf{Cosmo} (2022). Custom x86 operating system written from
                                 scratch. C/C++, x86 ASM, Bash
    \item \textbf{Lesion Map Prediction} (2021). A rat brain lesion map
                                                 prediction tool using neural
                                                 networks.
                                                 Python, TensorFlow, Keras
    \item \textbf{Classification Utils} (2021). Tools for experimenting with
                                                hyperparameter tuning machine
                                                learning classification models.
                                                Python, scikit-learn
\end{itemize}

\medskip

\begin{large}
    \textbf{Additional Experience and Awards}
\end{large}

\smallskip \hrule \smallskip

\begin{itemize}[topsep=0pt]
    \setlength\itemsep{0.2em}
    \item \textbf{Hypercube Scholar Award}: Named a Hypercube Scholar for
          outstanding undergraduate research in computational biology.
    \item \textbf{Teaching Assistant} (Spring 2017): Teaching assistant for a
          graduate course in cryptography; advised 33 students.
\end{itemize}

\medskip

\begin{large}
    \textbf{Languages and Technologies}
\end{large}

\smallskip \hrule \smallskip

\begin{itemize}[topsep=0pt]
    \setlength\itemsep{0.2em}
    \item \textbf{Languages}: C/C++ (proficient),
                              Python (proficient),
                              Bash (proficient),
                              Java (competent)
    \item \textbf{Tools and Platforms}: Linux/RTLinux,
                                        FreeRTOS,
                                        Docker,
                                        Jenkins CI,
                                        Google Test,
                                        CMake,
                                        Git,
                                        Subversion,
                                        Atlassian Stack
\end{itemize}

\end{document}
```

Here's a capture showing how the LaTeX above looks when compiled into a PDF:

![Resume as PDF](/posts/resumes-in-latex/resume_pdf.png)

# BUILDING THE RESUME

LaTeX source can be compiled into various document formats. One of the most
popular and appropriate for resumes is PDF. A frustrating aspect of working with
LaTeX is the sheer number of packages required to get a working distribution
capable of taking a vanilla `*.tex` and transforming it into a PDF.

I like Docker and the idea of containerizing software. In this case, I didn't
want to have to install well over 1GB of dependencies on my PC in order to build
my resume. To that end, I created the following Dockerfile:

```bash
FROM ubuntu:latest

ARG DEBIAN_FRONTEND=noninteractive

RUN apt-get update && \
    apt-get install --yes \
        texlive-base \
        texlive-latex-extra

RUN mkdir -p /mnt/resume

WORKDIR /mnt/resume
```

You can build a LaTeX image with the following command:

```bash
docker build . -t latex
```

Now, when you want to edit your resume, you can launch a container with the
directory containing your `*.tex` file mounted as a volume:

```bash
docker run \
    --rm \
    -it \
    --privileged \
    -v $(pwd):/mnt/resume \
    latex:latest
```

The command above will drop you in a Bash shell within the container. The
command assumes your `*.tex` files(s) are in your current working directory. You
can call the `pdflatex` program from within the container to transform the
`*.tex` source into a PDF:

```bash
pdflatex ivan_guerra_resume.tex
```

# MY WORKFLOW

I'll summarize my workflow in a couple of steps hopefully making it clear how
the resume edit-compile-view cycle works.

1. Place the `*.tex` file(s) and the Dockerfile in a common directory.
2. Build the `latex` Docker image.
3. Launch a `latex` container with the directory containing your LaTeX source
   files mounted as a volume (see the `docker run` command in the previous
   section).
4. Open the `*.tex` file in a text editor on the host.
5. Edit the document.
6. Compile the `*.tex` file into a PDF from the container shell using
   `pdflatex`.
7. View the output PDF in a PDF viewer or browser on the host. I actually leave
   the document open in the my viewer so that everytime I run `pdflatex` I see
   the updates instantly take effect.
8. Back to (5).

# CONCLUSION

Writing a resume can be hard. You can ease the pain of formatting your resume
using powerful tools such as LaTeX. In this article, I shared my LaTeX resume
template along with the tools and process I use to push updates.

You can find this template along with many of the scripts and sources referenced
in this article on my GitHub page under [resume][3].

[1]: https://en.wikipedia.org/wiki/LaTeX
[2]: https://www.careercup.com/resume
[3]: https://github.com/ivan-guerra/resume
