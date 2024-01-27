---
title: "ncube: A Cube in Your Terminal"
date: 2023-11-16T09:55:29-08:00
description: "Rendering a cube in the terminal."
tags: ["cli-tools", "c++", "ncurses"]
---

While surfing YouTube, I stumbled upon this ASMR programming video[^1] where the
developer programs a terminal display with a couple of spinning cubes. As I
watched, I realized I had no idea how 3D objects are rendered on a 2D screen.
All my life playing video games and I had never given it much thought. I perused
the code from the video and honestly wasn't able to glean much. I decided this
was a good opportunity to learn something new. I settled on developing a simple
ncurses[^2] application that would render a cube and allow the user to rotate it
using the arrow keys. Easy enough right...

## Perspective Projection and Rotation Matrices

So how do you take an object in 3D space and visualize it in 2D space? The
answer is perspective projection. I watched many videos that explained the
technique in detail. The one that "clicked" for me was "Carl the Person"'s
(cool name by the way) video tutorial:

{{< youtube eoXn6nwV694 >}}<br>

I won't try to repeat Carl's derivation of 3D to 2D coordinate transformation. I
will reveal the secret sauce though. To take a 3D coordinate \\((x,y,z)\\) and
transform it to its 2D projection \\((x_p, y_p)\\), apply the following formulas:

\\[ x_p = {x \over {z \tan{\theta \over 2}}} \\]
\\[ y_p = {y \over {z \tan{\theta \over 2}}} \\]

In the equation above, \\(\theta\\) is the angle in radians of the camera's
field of view. More on that later.

Okay cool, so we can go from 3D to 2D. What about rotating the object? This part
wasn't so new to me. I'd seen plenty of rotation matrices in my time developing
aerospace software. The general 3D rotation matrix that you can copy paste from
Wikipedia[^3] does the trick:

\\[
    \begin{bmatrix}
        \cos \beta \cos \gamma & \sin \alpha \sin \beta \cos \gamma - \cos \alpha \sin \gamma & \cos \alpha \sin \beta \cos \gamma + \sin \alpha \sin \gamma \\\\
        \cos \beta \sin \gamma & \sin \alpha \sin \beta \sin \gamma + \cos \alpha \cos \gamma & \cos \alpha \sin \beta \sin \gamma - \sin \alpha \cos \gamma \\\\
        -\sin \beta & \sin \alpha \cos \beta & \cos \alpha \cos \beta
    \end{bmatrix}
    \begin{bmatrix}
        x \\\\
        y \\\\
        z
    \end{bmatrix}
    =
    \begin{bmatrix}
        x_r \\\\
        y_r \\\\
        z_r
    \end{bmatrix}
\\] 

Where \\(\alpha\\), \\(\beta\\), and \\(\gamma\\) are the camera's yaw, pitch,
and roll angles in radians. In this application, I've zeroed the yaw and set the roll
and pitch angles using a "cursor" location. To explain a bit further, when the
application starts, an invisible cursor is placed in the center of the screen.
When the user presses the arrows keys, the application updates the \\((x_{cursor}, y_{cursor})\\)
location of the cursor accordingly. The cursor location is later used to
determine the roll and pitch angles using the following formulas:

\\[\beta = {x_{cursor} \over s_{width}} \times \pi\\]
\\[\gamma = {y_{cursor} \over s_{height}} \times \pi\\]

Where \\(s_{width}\\) and \\(s_{height}\\) are the screen width/height.

Putting all the above together, I developed the following projection/rotation
function:

```cpp
Faces2D RotateAndProject3Dto2D(const Cube &cube, const ViewConfig &conf,
                        double cursor_x, double cursor_y) {
  const double kCursorXRatio = (cursor_x / conf.near_plane_width) * kPi;
  const double kCursorYRatio = (cursor_y / conf.near_plane_height) * kPi;

  ncube::Faces2D cube_faces_2d;
  for (const Face3D &face_3d : cube.GetFaces()) {
    ncube::Face2D face_2d;
    for (const Point3D &point : face_3d) {
      /* create the rotated 3D point */
      Point3D rotated_point = Rotate3D(
          point, {.roll = kCursorYRatio, .pitch = kCursorXRatio, .yaw = 0});

      /* distance the camera from the cube */
      rotated_point.z += conf.camera_distance;

      /* perform a perspective projection */
      Point2D projection_2d = {
          .x = Transform3DTo2D(rotated_point.x, rotated_point.z,
                               conf.fov_angle_deg),
          .y = Transform3DTo2D(rotated_point.y, rotated_point.z,
                               conf.fov_angle_deg)};

      /* shift the coordinate to account for the fact the origin is the top left
       * of our screen */
      projection_2d.x =
          projection_2d.x * conf.near_plane_width + conf.near_plane_width / 2.0;
      projection_2d.y = projection_2d.y * conf.near_plane_height +
                        conf.near_plane_height / 2.0;
      face_2d.push_back(projection_2d);
    }
    cube_faces_2d.push_back(face_2d);
  }
  return cube_faces_2d;
}
```

`RotateAndProject3Dto2D()` takes as input the cube, current cursor position, and what I
am calling view configurations (i.e., camera FOV angle, near plane dimensions,
etc.). The function iterates over each 3D coordinate on each face of the cube.
For each point we perform the following steps:

1. Rotate the point. `Rotate3D()` implements the rotation matrix multiplication.
2. Apply the perspective projection. `Transform3DTo2D()` is a "generic" version
   of the perspective projection formulas.
3. Offset the coordinate to account for the fact our 2D coordinate system (the
   screen as defined by ncurses) has its origin at the top left of the screen.

The output of `RotateAndProject3Dto2D()` is a collection of 2D points that when plotted
on the screen will show the cube projected and rotated. 

## Drawing the Line

My cube representation isn't much different than what I had seen others do on
similar projects (i.e., a collection of 3D points defining the vertices of the
cube). That said, others were using visualization APIs that allowed them to draw
lines between points. Take a look at the image below which was snipped from
"Carl the Person"'s video:

![Cube With Edges](/posts/ncube/cube-with-edges.png#center)

Now compare that with a capture of my cube in a similar orientation:

![Cube Without Edges](/posts/ncube/cube-without-edges.png#center)

Yeah...eight vertices floating around in space looks like crap. As far as I
know, ncurses cannot draw anything more than vertical and horizontal lines. So
what do we do?

The solution is to define points along the edges of the cube. How do you do
that? Well you could do it manually but that's no fun. My StackOverflow searches
showed plenty of Python examples where interpolation was used to define equally
spaced points along a line in 3D space[^4]. Cool, but I wasn't about to
implement that in C++ or integrate a 3rd party library just to solve this little
problem. 

I came up with a solution[^5] for generating \\(N\\) equidistant points on the
line between two endpoints in 3D space. The idea is to repeatedly compute
midpoints until you have generated \\(N\\) midpoints. Lets look at an example.

Imagine we wanted to generate 7 points between an edge start and end point. We
can compute the midpoint of the start and end point call it \\(M_1\\). Then we
could compute the midpoint between the start and \\(M_1\\), \\(M_2\\), and the
midpoint between \\(M_1\\) and end, \\(M_3\\). Continue applying this process
recursively until you have generated the 7th midpoint, \\(M_7\\). The figure
below illustrates the process.

![Generating Edge Points](/posts/ncube/generating-edge-points.webp)

A nuance of the algorithm is that the midpoints must be generated in the order
\\(M_1, M_2, M_3, ..., M_7\\). Put in other words, we need to generate the tree
above in breadth-first order[^6].

Below is my C++ implementation of the algorithm:

```cpp
Face3D Cube::GenPoints(const Point3D a, const Point3D& b,
                       unsigned int num_points) const {
  using PointPair = std::pair<Point3D, Point3D>;
  std::queue<PointPair> buffer;
  buffer.emplace(a, b);

  /* This a BFS traversal of the tree that is formed by recursively finding the
   * midpoint, m, of a and b, then the midpoint of a and m, m and b, and so on.
   * The process terminates when we have generated the requested number of
   * points: num_points. */
  Face3D points;
  while (points.size() != num_points) {
    PointPair pp = buffer.front();
    buffer.pop();

    Point3D midpoint = Midpoint(pp.first, pp.second);
    points.push_back(midpoint);

    buffer.push({pp.first, midpoint});
    buffer.push({midpoint, pp.second});
  }
  return points;
}
```

`GenPoints()` implements a straightforward BFS traversal of the "midpoint
tree". The BFS queue's elements are pairs of 3D points representing the start
and end point of line segments on the original line. The algorithm terminates
when `num_points` midpoints have been pushed into the return vector, `points`.

I made the number of edge points a command line option with a default of 5. In
the image below, I've run the application with the number of edge points set to
21:


![Cube With Generated Edges](/posts/ncube/cube-with-generated-edges.png)

Not the prettiest cube in the world, but much easier to make out than before!

## Conclusion

Below is a demo showing the `ncube` application in action:

{{< video src="/posts/ncube/ncube-demo.mp4" type="video/mp4" preload="auto" >}}

My biggest takeaway from this project was learning the purpose, concepts, and
math behind perspective projection. I also enjoyed coming up with a solution to
the problem of generating nice-ish looking edges for the cube using a textbook
CS approach. Amongst the many toy apps I've written, `ncube` is one of my top 5
maybe because crappy 3D graphics have a special place in my heart.

You can find the complete project source with build instructions, usage, etc. on
my GitHub page under [ncube][5].


[1]: https://www.youtube.com/watch?v=p09i_hoFdd0
[2]: https://en.wikipedia.org/wiki/Ncurses
[3]: https://en.wikipedia.org/wiki/Rotation_matrix#General_3D_rotations
[4]: https://stackoverflow.com/questions/32208359/is-there-a-multi-dimensional-version-of-arange-linspace-in-numpy
[5]: https://github.com/ivan-guerra/ncube

[^1]: ["ASMR Programming - Spinning Cube"][1]
[^2]: [ncurses][2]
[^3]: [General 3D Rotations][3]
[^4]: [Is there a multi-dimensional version of arange/linspace in numpy?][4]
[^5]: This method of equidistant point generation is new to me. Chances are it
    has existed since before I was born and has some technical name.
[^6]: After over a decade, all that time on LeetCode payed off! I get to
    encounted a BFS algorithm in the wild! /s
