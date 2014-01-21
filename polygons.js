"use strict";

//https://github.com/substack/point-in-polygon/blob/master/index.js
// http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
//to be replaced by a vertex radius filter when there is a kd map.
function pointInPolygon(point, polygon) {
    var x = point.x, y = point.y;
    var inside = false;
    for (var i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        var xi = polygon[i].x, yi = polygon[i].y;
        var xj = polygon[j].x, yj = polygon[j].y;

        var intersect = ((yi > y) != (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function vectLength(x, y) {
    return Math.sqrt(sqVectorLength(x, y));
}

function sqr(val) {
    return val * val;
}

function sqVectorLength(x, y) {
    return sqr(x) + sqr(y);
}

function segLength(segment) {
    return vectLength(segment[0].x - segment[1].x, segment[0].y - segment[1].y);
}

function sqSegLength(segment) {
    return sqVectorLength(segment[0].x - segment[1].x, segment[0].y - segment[1].y);
}

function unitVector(inVector) {
    var len = vectLength(inVector.x, inVector.y);
    return {x: inVector.x / len, y: inVector.y / len};
}

function bisectorVector(v1, v2) {
    var l1 = vectLength(v1.x, v1.y);
    var l2 = vectLength(v2.x, v2.y);
    return {x: l2 * v1.x + l1 * v2.x, y: l2 * v1.y + l1 * v2.y};
}

function segmentToVector(segment) {
    return {x: segment[1].x - segment[0].x, y: segment[1].y - segment[0].y};
}

function perpendicularPoint(vertex, segment) {
    var vector = unitVector(segmentToVector(segment));
    //noinspection JSSuspiciousNameCombination
    var v = {x: -vector.y, y: vector.x};
    return  {x: vertex.x + v.x * 100, y: vertex.y + v.y * 100};
}

function bisectorVectorFromSegments(s1, s2) {
    return bisectorVector({x: s1[1].x - s1[0].x, y: s1[1].y - s1[0].y},
        {x: s2[1].x - s2[0].x, y: s2[1].y - s2[0].y});
}

function pointEquals(p1, p2) {
    return p1.x == p2.x && p1.y == p2.y;
}

function pointProjectedOnSegment(point, segment) {
    function dist2(v, w) {
        return sqr(v.x - w.x) + sqr(v.y - w.y)
    }

    var v = segment[0];
    var w = segment[1];
    var l2 = dist2(v, w);
    if (l2 == 0) return dist2(point, v);
    var t = ((point.x - v.x) * (w.x - v.x) + (point.y - v.y) * (w.y - v.y)) / l2;
    if (t >= 0 && t <= 1)
        return { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) };
    return null;
}

function distToSegmentSquared(point, segment) {
    function dist2(v, w) {
        return sqr(v.x - w.x) + sqr(v.y - w.y)
    }

    var v = segment[0];
    var w = segment[1];
    var l2 = dist2(v, w);
    if (l2 == 0) return dist2(point, v);
    var t = ((point.x - v.x) * (w.x - v.x) + (point.y - v.y) * (w.y - v.y)) / l2;
    if (t < 0) return dist2(point, v);
    if (t > 1) return dist2(point, w);
    return dist2(point, { x: v.x + t * (w.x - v.x),
        y: v.y + t * (w.y - v.y) });
}

function signedArea(polygon) {
    var area = 0;
    for (var i = 0; i < polygon.length; i++) {
        var next = polygon[(i + 1) % polygon.length];
        area += polygon[i].x * next.y - polygon[i].y * next.x;
    }
    return area / 2;
}

//http://www.kevlindev.com/gui/math/intersection/Intersection.js
function intersectionAbscissa(seg1, seg2) {
    var a1 = seg1[0], a2 = seg1[1], b1 = seg2[0], b2 = seg2[1];
    var divisor = (b2.y - b1.y) * (a2.x - a1.x) - (b2.x - b1.x) * (a2.y - a1.y);
    var ua_t = (b2.x - b1.x) * (a1.y - b1.y) - (b2.y - b1.y) * (a1.x - b1.x);
    var ub_t = (a2.x - a1.x) * (a1.y - b1.y) - (a2.y - a1.y) * (a1.x - b1.x);
    var ua = ua_t / divisor;
    var ub = ub_t / divisor;
    return [ua, ub];
}

//http://www.kevlindev.com/gui/math/intersection/Intersection.js
function intersectionSegments(seg1, seg2, allowOutside) {
    //order the segments so that the results are always the same
    if (comparePoint(seg1[0], seg2[0]) > 0) {
        var tmp = seg1;
        seg1 = seg2;
        seg2 = tmp;
    }
    var a1 = seg1[0], a2 = seg1[1];
    var u = intersectionAbscissa(seg1, seg2);
    var ua = u[0];
    var ub = u[1];
    if (allowOutside && isFinite(ua) && isFinite(ub) || (0 <= ua && ua <= 1 && 0 <= ub && ub <= 1))
        return {x: a1.x + ua * (a2.x - a1.x), y: a1.y + ua * (a2.y - a1.y)};
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
