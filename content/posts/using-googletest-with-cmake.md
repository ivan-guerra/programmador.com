---
title: "Using GoogleTest with CMake"
date: 2024-01-23T15:13:27-08:00
description: "How to use GoogleTest with CMake."
tags: ["cmake", "c++"]
---

If you've worked in a large C++ codebase within the last couple of years, you've
probably come across the GoogleTest[^1] unit testing framework. Chances are
you have also encountered everyone's favorite build generator: CMake[^2]. In
this post, I am going to walk you through two options for integrating GoogleTest
into your next CMake project.

I want to make clear the content that follows is largely a condensed version of
the info found in ["An Introduction to Modern CMake"][3]. That article has a lot
of great info. My post is meant to summarize the bits relevant to using CMake
with GoogleTest as a quick reference when setting up future projects.

# BEFORE WE DIVE IN...

I just wanted to share what I am assuming the directory structure of your
project looks like. Obviously, you can structure your project however you like.
That said, my projects and a lot of the C++ projects out there that use CMake
are structured like:

```bash
my_project/
    docs/
    extern/
    include/
    src/
    test/
```

In this post, we'll be focusing on what goes in the `extern/` and `test/`
folders. For those unfamiliar, `extern/` is meant to house any external
libraries your project includes. `test/` holds your unit tests in this case
GoogleTest CPP files.

# OPTION 1: SUBMODULE

One way to include GoogleTest in your CMake project is to have it be a project
submodule. Step one in doing that is settling on a GoogleTest release version
for your project. Visit the [GoogleTest GitHub][1] page, click `Switch
branches/tags`, and then click `Tags`. Pick a `release-*` version that makes
sense for your project:

![GoogleTest Release Versions](/posts/using-googletest-with-cmake/gtest-releases.png)

Now add your selected GoogleTest version as a submodule under the `extern/`
folder. Replace `release-1.12.1` below with the tag name of the version you want
to use:

```bash
git submodule add --branch release-1.12.1 https://github.com/google/googletest.git extern
```

In the toplevel `CMakeLists.txt`, add the following lines:

```cmake
option(BUILD_TESTS "Build the tests" ON)
if(BUILD_TESTS)
    enable_testing()
    include(GoogleTest)
    add_subdirectory(tests)
endif()

add_subdirectory("extern/googletest")
```

The above lines allow you to generate and build GoogleTest targets along with
your project's CMake targets. You can disable the build of unit tests by setting
the `BUILD_TESTS` option to `OFF` either in the `CMakeListst.txt` (not
recommended) or via the CMake CLI: `-DBUILD_TESTS=<ON/OFF>`. Done! Well
almost...

To keep your `CACHE` cleaner, add the following lines:

```cmake
mark_as_advanced(
    BUILD_GMOCK BUILD_GTEST BUILD_SHARED_LIBS
    gmock_build_tests gtest_build_samples gtest_build_tests
    gtest_disable_pthreads gtest_force_shared_crt gtest_hide_internal_symbols
)
```

To support some IDEs' folder clean function, you can also add the following
lines:

```cmake
set_target_properties(gtest PROPERTIES FOLDER extern)
set_target_properties(gtest_main PROPERTIES FOLDER extern)
set_target_properties(gmock PROPERTIES FOLDER extern)
set_target_properties(gmock_main PROPERTIES FOLDER extern)
```

# OPTION 2: `FetchContent()`

Perhaps a better, more modern way to bring GoogleTest into your CMake project
is to use the `FetchContent` module introduced in CMake3.11. The advantage of
`FetchContent` over submodules is that dependency management is now part of
your CMake project itself. It's also pretty easy to use, just add the following
snippet to your toplevel `CMakeLists.txt`:

```cmake
include(FetchContent)

FetchContent_Declare(
  googletest
  GIT_REPOSITORY https://github.com/google/googletest.git
  GIT_TAG release-1.12.1)
FetchContent_MakeAvailable(googletest)

option(BUILD_TESTS "Build Unit Tests" OFF)
if(BUILD_TESTS)
    enable_testing()
    include(GoogleTest)
    add_subdirectory(tests)
endif()
```

`FetchContent` can take many additional arguments not shown here. Worth checking
out the docs[^3] to get the full picture.

# CONCLUSION

To summarize, you can use Git submodules or CMake3.11+'s `FetchContent` module
to smoothly integrate GoogleTest as part of your CMake project. `FetchContent`
is the modern and preferred method. Submodules are the backup. For more
in-depth coverage of CMake, checkout ["An Introduction to Modern CMake"][3].
Also take a look at GoogleTest's ["Quickstart: CMake"][5] if you need some help
working with GoogleTest and CMake beyond just the build.

[1]: https://github.com/google/googletest
[2]: https://cmake.org/getting-started/
[3]: https://cliutils.gitlab.io/modern-cmake/
[4]: https://cmake.org/cmake/help/latest/module/FetchContent.html
[5]: https://google.github.io/googletest/quickstart-cmake.html

[^1]: In my experience, [GoogleTest][1] is arguably the most popular C++ unit
    testing framework around. It's well documented and featureful. Check it out.
[^2]: [CMake][2] gets a bad wrap in the C/C++ community. While it is a complex
    tool, it's the best we got and the documentation is high quality.
[^3]: [FetchContent Docs][4]. Be sure to select the right CMake version from the
    drop down menu in the top left of the screen!
