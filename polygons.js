"use strict";

//http://www.kevlindev.com/gui/math/intersection/Intersection.js
function intersectionSegments(seg1, seg2) {
  var a1 = seg1[0], a2 = seg1[1], b1 = seg2[0], b2 = seg2[1];
  var ua_t = (b2.x - b1.x) * (a1.y - b1.y) - (b2.y - b1.y) * (a1.x - b1.x);
  var ub_t = (a2.x - a1.x) * (a1.y - b1.y) - (a2.y - a1.y) * (a1.x - b1.x);
  var u_b = (b2.y - b1.y) * (a2.x - a1.x) - (b2.x - b1.x) * (a2.y - a1.y);

  if (u_b != 0) {
    var ua = ua_t / u_b;
    var ub = ub_t / u_b;
    if (0 <= ua && ua <= 1 && 0 <= ub && ub <= 1) {
      return {x: a1.x + ua * (a2.x - a1.x), y: a1.y + ua * (a2.y - a1.y)};
    }
  }
  return null;
}

function createIntersections(segments) {
  var intersections = [];
  for (var i = 0; i < segments.length; i++) {
    for (var j = i + 1; j < segments.length; j++) {
      var intersection =  intersectionSegments(segments[i], segments[j])
      if (intersection)
        intersections.push(intersection);
    }
  }
  return intersections;
}