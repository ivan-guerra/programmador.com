---
title: "Using GoogleTest with CMake"
date: 2024-01-23T15:13:27-08:00
description: "How to use GoogleTest with CMake."
tags: ["cmake", "c++"]
---

If you've worked in a large C++ codebase within the last couple of years, you've
probably come across the [GoogleTest][1] unit testing framework. Chances are
you've also encountered everyone's favorite build generator: [CMake][2]. In this
article, you will see two options for integrating GoogleTest into your next
CMake project.

The content that follows is largely a condensed version of the tips found in
["An Introduction to Modern CMake"][3]. This post summarizes the bits relevant
to using CMake with GoogleTest to act as a quick reference when setting up
future projects.

## About Project Organization

You can structure your C/C++ project however you like. That said, this article
and a lot of the C++ projects out there that use CMake have a structure like so:

```bash
my_project/
    docs/
    extern/
    include/
    src/
    test/
```

The focus here is on what goes in the `extern/` and `test/` folders. For those
unfamiliar, `extern/` houses any external libraries your project includes.
`test/` holds your unit tests in this case GoogleTest CPP files.

## Option 1: Submodule

One way to include GoogleTest in your CMake project is to have it be a project
submodule. Step one is to settle on a GoogleTest release version for your
project. Visit the [GoogleTest GitHub][1] page, click _Switch branches/tags_,
and then click _Tags_. Pick a `release-*` version that makes sense for your
project:

![GoogleTest Release Versions](/posts/2024/using-googletest-with-cmake/gtest-releases.webp#center)

Now add your selected GoogleTest version as a submodule under the `extern/`
folder. Replace `release-1.12.1` below with the tag name of the version you want
to use:

```bash
git submodule add --branch release-1.12.1 https://github.com/google/googletest.git extern
```

In the top level `CMakeLists.txt`, add the following lines:

```cmake
option(BUILD_TESTS "Build the tests" ON)
if(BUILD_TESTS)
    enable_testing()
    include(GoogleTest)
    add_subdirectory(tests)
endif()

add_subdirectory("extern/googletest")
```

These lines generate and build GoogleTest targets along with your project's
CMake targets. You can disable the build of unit tests by setting the
`BUILD_TESTS` option to `OFF` either in the `CMakeListst.txt` (not recommended)
or via the CMake CLI: `-DBUILD_TESTS=<ON/OFF>`. Done! Well almost.

To keep your CMake cache clean, add the following lines:

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

## Option 2: `FetchContent()`

Perhaps a better, more modern way to bring GoogleTest into your CMake project
is to use the `FetchContent` module introduced in CMake3.11. The advantage of
`FetchContent` over submodules is that dependency management is now part of
your CMake project itself. It's also pretty easy to use, just add the following
snippet to your top level `CMakeLists.txt`:

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
out the [docs][4] to get the full picture.

## Conclusion

To summarize, you can use Git submodules or CMake3.11+'s `FetchContent` module
to integrate GoogleTest as part of your CMake project. `FetchContent` is the
modern and preferred method. Submodules are the backup. For more in-depth
coverage of CMake, checkout ["An Introduction to Modern CMake"][3]. Also take a
look at GoogleTest's ["Quickstart: CMake"][5] for examples including an initial
test and accompanying `CMakeLists.txt`.

[1]: https://github.com/google/googletest
[2]: https://cmake.org/getting-started/
[3]: https://cliutils.gitlab.io/modern-cmake/
[4]: https://cmake.org/cmake/help/latest/module/FetchContent.html
[5]: https://google.github.io/googletest/quickstart-cmake.html
