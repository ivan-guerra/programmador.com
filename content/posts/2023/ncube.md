---
title: "ncube: A Cube in Your Terminal"
date: 2023-11-16T09:55:29-08:00
description: "Rendering a cube in the terminal."
tags: ["cli-tools", "c++", "ncurses"]
---

You ever come across one of those ASMR programming videos? [This video][1] where
the developer programs a terminal display with a couple of spinning cubes is
neat. This video is the motivation for the development of a [ncurses][2]
application that renders a user controlled 3D cube.

## Perspective Projection and Rotation Matrices

So how do you take an object in 3D space and visualize it in 2D space? The
answer is perspective projection. Many videos explain the technique in detail.
One of the better videos is "Carl the Person"'s (cool name by the way) video
tutorial:

{{< youtube eoXn6nwV694 >}}

No need to repeat Carl's derivation of 3D to 2D coordinate transformation here.
You just need to apply the secret sauce. To take a 3D coordinate \\((x,y,z)\\)
and transform it to its 2D projection \\((x_p, y_p)\\), apply the following
formulas:

\\[ x_p = {x \over {z \tan{\theta \over 2}}} \\]
\\[ y_p = {y \over {z \tan{\theta \over 2}}} \\]

In these equations, \\(\theta\\) is the angle in radians of the camera's field
of view. More on that later.

Okay cool, so you can go from 3D to 2D. What about rotating the object? The
general 3D rotation matrix that you can copy paste from [Wikipedia][3] does the
trick:

\\[\begin{bmatrix} \cos \beta \cos \gamma & \sin \alpha \sin \beta \cos \gamma - \cos \alpha \sin \gamma & \cos \alpha \sin \beta \cos \gamma + \sin \alpha \sin \gamma \\\\\cos \beta \sin \gamma & \sin \alpha \sin \beta \sin \gamma + \cos \alpha \cos \gamma & \cos \alpha \sin \beta \sin \gamma - \sin \alpha \cos \gamma \\\\-\sin \beta & \sin \alpha \cos \beta & \cos \alpha \cos \beta \end{bmatrix}
\begin{bmatrix} x \\\\y \\\\z\end{bmatrix} = \begin{bmatrix} x_r \\\\y_r \\\\z_r \end{bmatrix}\\]

Where \\(\alpha\\), \\(\beta\\), and \\(\gamma\\) are the camera's yaw, pitch,
and roll angles in radians. You need to zero the yaw and set the roll and pitch
angles using a "cursor" location. To explain a bit further, when the application
starts, an invisible cursor sits in the center of the screen. When the user
presses the arrows keys, the application updates the \\((x*{cursor},
y*{cursor})\\) location of the cursor accordingly. The cursor location is later
used to determine the roll and pitch angles using the following formulas:

\\[\beta = {x_{cursor} \over s_{width}} \times \pi\\]
\\[\gamma = {y_{cursor} \over s_{height}} \times \pi\\]

Where \\(s*{width}\\) and \\(s*{height}\\) are the screen width/height.

Putting it all together, you get the following projection/rotation function:

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

`RotateAndProject3Dto2D()` takes as input the cube, current cursor position, and
the view configurations (that is, camera FOV angle, near plane dimensions,
etc.). The function iterates over each 3D coordinate on each face of the cube.
For each point, you perform the following steps:

1. Rotate the point. `Rotate3D()` implements the rotation matrix multiplication.
2. Apply the perspective projection. `Transform3DTo2D()` is a "generic" version
   of the perspective projection formulas.
3. Offset the coordinate to account for the fact the 2D coordinate system (the
   screen as defined by ncurses) has its origin at the top left of the screen.

The output of `RotateAndProject3Dto2D()` is a collection of 2D points that when
plotted on the screen will show the cube projected and rotated.

## Drawing the Line

You represent a cube as a collection of 3D points defining the vertices of the
cube. You need a method to draw lines between the vertex points. Some demos use
a visualization API capable of drawing lines between points. Take a look at the
image below taken from "Carl the Person"'s video:

![Cube With Edges](/posts/2023/ncube/cube-with-edges.webp#center#center)

Now compare that with a capture of your cube in a similar orientation:

![Cube Without Edges](/posts/2023/ncube/cube-without-edges.webp#center#center)

Eight vertices floating around in space looks like crap. ncurses can't draw
anything more than vertical and horizontal lines. What now?

The solution is to define points along the edges of the cube. How do you do
that? Well you could do it manually but that's no fun. StackOverflow shows
plenty of [Python examples][4] where you interpolate to define equally spaced
points along a line in 3D space. Cool, but you don't want to implement that in
C++ or integrate a 3rd party library just to solve this little problem.

There's another solution for generating \\(N\\) equidistant points on the line
between two endpoints. The idea is to repeatedly compute midpoints until you
have generated \\(N\\) midpoints. Here's an example.

Imagine you wanted to generate 7 points between an edge start and end point. You
compute the midpoint of the start and end point call it \\(M_1\\). Then you
compute the midpoint between the start and \\(M_1\\), \\(M_2\\), and the
midpoint between \\(M_1\\) and end, \\(M_3\\). Continue applying this process
recursively until you have generated the 7th midpoint, \\(M_7\\). The figure
below illustrates the process.

```text
Start                                 M_1                                        End
  -------------------------------------O-------------------------------------------
                                       |
                 M_2                   |                     M_3
                  ---------------------+-----------------------
                  O                                           O
       M_4        |      M_5                       M_6        |       M_7
        ----------+--------                         ----------+---------
        O                 O                         O                  O
```

You want to generate midpoints in the order \\(M_1, M_2, M_3, ..., M_7\\). Put
in other words, you need to generate the tree in breadth-first order.

Below is a C++ implementation of the algorithm:

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

`GenPoints()` implements a BFS traversal of the "midpoint tree." The BFS queue's
elements are pairs of 3D points representing the start and end point of line
segments on the original line. The algorithm terminates when the `points` vector
has a size of `num_points`.

You can make the number of edge points a command line option. The cube below has
an edge points count of 21:

![Cube With Generated Edges](/posts/2023/ncube/cube-with-generated-edges.webp#center)

Not the prettiest cube in the world, but much easier to make out than before!

## Conclusion

Below is a demo showing the `ncube` application in action:

{{< video src="/posts/2023/ncube/ncube-demo.mp4" type="video/mp4" preload="auto" >}}

The biggest takeaway from this project is learning the purpose, concepts, and
math behind perspective projection. Bonus points for coming up with a solution
to the problem of generating nice-ish looking edges for the cube using a
textbook CS approach. `ncube` is satisfying to run. The crappy 3D graphics are
something special.

The complete project source with build instructions, usage, etc. is available on
GitHub under [ncube][5].

[1]: https://www.youtube.com/watch?v=p09i_hoFdd0
[2]: https://en.wikipedia.org/wiki/Ncurses
[3]: https://en.wikipedia.org/wiki/Rotation_matrix#General_3D_rotations
[4]: https://stackoverflow.com/questions/32208359/is-there-a-multi-dimensional-version-of-arange-linspace-in-numpy
[5]: https://github.com/ivan-guerra/ncube
