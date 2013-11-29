"use strict";

//http://www.kevlindev.com/gui/math/intersection/Intersection.js
function intersectionSegments(seg1, seg2) {
  //order the segments so that the results are always the same
  if (comparePoint(seg1[0], seg2[0]) > 0) {
    var tmp = seg1;
    seg1 = seg2;
    seg2 = tmp;
  }
  var a1 = seg1[0], a2 = seg1[1], b1 = seg2[0], b2 = seg2[1];
  var ua_t = (b2.x - b1.x) * (a1.y - b1.y) - (b2.y - b1.y) * (a1.x - b1.x);
  var ub_t = (a2.x - a1.x) * (a1.y - b1.y) - (a2.y - a1.y) * (a1.x - b1.x);
  var divisor = (b2.y - b1.y) * (a2.x - a1.x) - (b2.x - b1.x) * (a2.y - a1.y);

  if (divisor != 0) {
    var ua = ua_t / divisor;
    var ub = ub_t / divisor;
    if (0 <= ua && ua <= 1 && 0 <= ub && ub <= 1)
      return {x: a1.x + ua * (a2.x - a1.x), y: a1.y + ua * (a2.y - a1.y)};
  }
  return null;
}

function createIntersections(segments) {
  var intersections = [];
  for (var i = 0; i < segments.length; i++)
    if (comparePoint(segments[i][0], segments[i][1]) > 0)
      segments[i].reverse();
  for (i = 0; i < segments.length; i++) {
    for (var j = i + 1; j < segments.length; j++) {
      var intersection = intersectionSegments(segments[i], segments[j]);
      if (intersection)
        intersections.push([intersection, [segments[i], segments[j]]]);
    }
  }
  return intersections;
}

function comparePoint(p1, p2) {
  if (p1.x < p2.x)
    return -1;
  if (p1.x == p2.x)
    return p1.y - p2.y;
  return 1;
}

function eventsForSegment(segment) {
  var s = [segment[0], segment[1]];
  if (comparePoint(segment[0], segment[1]) > 0)
    s.reverse();
  return [
    {type: 'left', point: s[0], segment: s, action: function (scanBeam, eventQueue) {
      scanBeam.leftPoint(s[0], s, eventQueue);
    }},
    {type: 'right', point: s[1], segment: s, action: function (scanBeam, eventQueue) {
      scanBeam.rightPoint(s[1], s, eventQueue);
    }}
  ];
}

function initialPopulationOfQueue(segments) {
  var initialEvents = [];
  for (var i = 0; i < segments.length; i++) {
    var events = eventsForSegment(segments[i]);
    initialEvents.push(events[0]);
    initialEvents.push(events[1]);
  }
  return createMockEventQueue(initialEvents);
}

function bentleyOttmann(segments) {
  var queue = initialPopulationOfQueue(segments);
  var scanBeam = createMockScanBeam();
  while (!queue.isEmpty())
    queue.fetchFirst().action(scanBeam, queue);
  return scanBeam.getResult();
}

function createMockEventQueue(initialEvents) {
  var queue = [];

  function pointEquals(p1, p2) {
    return p1.x == p2.x && p1.y == p2.y;
  }

  function segmentEqual(s1, s2) {
    return s1 == s2
        || pointEquals(s1[0], s2[0]) && pointEquals(s1[1], s2[1])
        || pointEquals(s1[1], s2[0]) && pointEquals(s1[0], s2[1]);
  }

  function eventExists(event) {
    for (var i = 0; i < queue.length; i++)
      if (queue[i].type == 'intersection'
          && (segmentEqual(event.segments[0], queue[i].segments[0]) && segmentEqual(event.segments[1], queue[i].segments[1])
          || segmentEqual(event.segments[1], queue[i].segments[0]) && segmentEqual(event.segments[0], queue[i].segments[1])))
        return true;
    return false
  }

  function compareEvents(e1, e2) {
    return comparePoint(e1.point, e2.point);
  }

  function sort() {
    queue.sort(compareEvents);
  }

  Array.prototype.push.apply(queue, initialEvents);
  sort();
  return {
    pushIntersectionEvent: function (event) {
      if (eventExists(event))
        return;
      queue.push(event);
      sort();
    },
    fetchFirst: function () {
      return queue.shift();
    },
    isEmpty: function () {
      return queue.length == 0;
    },
    dumpQueue: function () {
      var res = [];
      for (var i = 0; i < queue.length; i++)
        res.push(queue[i]);
      return res;
    }
  }
}

function createMockScanBeam() {
  var beam = [];
  var result = [];

  function findIndex(point) {
    function segmentHeight(segment, x) {
      if (segment[0].x > segment[1].x)
        throw 'backwards segment';
      var t = (x - segment[0].x) / (segment[1].x - segment[0].x);
      return segment[0].y + t * (segment[1].y - segment[0].y);
    }

    for (var i = 0; i < beam.length; i++) {
      var segmentH = segmentHeight(beam[i], point.x);
      if (segmentH > point.y)
        return i;
    }
    return beam.length;
  }

  function findSegmentIndex(segment) {
    for (var i = 0; i < beam.length; i++)
      if (beam[i] == segment)
        return i;
    throw 'oops segment not in beam???';
  }

  function swap(i1, i2) {
    var tmp = beam[i1];
    beam[i1] = beam[i2];
    beam[i2] = tmp;
  }

  function pushIfIntersectsOnRight(currentPoint, previousSegment, nextSegment, eventQueue) {
    var intersection = intersectionSegments(nextSegment, previousSegment);
    if (intersection != null && comparePoint(currentPoint, intersection) < 0) {
      var segments = [previousSegment, nextSegment];
      eventQueue.pushIntersectionEvent({type: 'intersection', point: intersection, segments: segments,
        action: function (scanBeam, eventQueue) {
          scanBeam.intersectionPoint(intersection, segments, eventQueue);
        }});
    }
  }

  return {
    leftPoint: function (point, segment, eventQueue) {
      var insertionIndex = findIndex(point);
      if (insertionIndex > 0)
        pushIfIntersectsOnRight(point, beam[insertionIndex - 1], segment, eventQueue);
      if (insertionIndex < beam.length)
        pushIfIntersectsOnRight(point, segment, beam[insertionIndex], eventQueue);
      beam.splice(insertionIndex, 0, segment);
    },
    rightPoint: function (point, segment, eventQueue) {
      var segmentIndex = findSegmentIndex(segment);
      if (segmentIndex > 0 && segmentIndex < beam.length - 1)
        pushIfIntersectsOnRight(point, beam[segmentIndex - 1], beam[segmentIndex + 1], eventQueue);
      beam.splice(segmentIndex, 1);
    },
    intersectionPoint: function (point, segments, eventQueue) {
      result.push([point, segments]);
      var before = findSegmentIndex(segments[0]);
      var after = findSegmentIndex(segments[1]);
      swap(before, after);
      if (before > 0)
        pushIfIntersectsOnRight(point, beam[before - 1], segments[1], eventQueue);
      if (after < beam.length - 1)
        pushIfIntersectsOnRight(point, segments[0], beam[after + 1], eventQueue);
    },
    getResult: function () {
      return result;
    },
    dumpBeam: function () {
      var res = [];
      for (var i = 0; i < beam.length; i++)
        res.push(beam[i]);
      return res;
    }
  };
}
