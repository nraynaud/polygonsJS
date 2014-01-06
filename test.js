"use strict";
function pathList2svg(paths) {
    var content = '';
    for (var i = 0; i < paths.length; i++)
        content += '<path class="' + paths[i].cssClass + '" d="' + paths[i].d + '"/>\n';
    return '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150">' + content + '</svg>';
}

function path2svg(path, cssClass) {
    return pathList2svg([
        {d: path, cssClass: cssClass}
    ]);
}

function inTd(element) {
    return '<td>' + element + '</td>';
}

function svgDisplayTable(table) {
    var div = '<div>Geometry: <table class="svgTest"><tr>';
    for (var i = 0; i < table.length; i++)
        div += '<th>' + table[i].label + '</th>';
    div += '</tr>';
    for (i = 0; i < table.length; i++)
        div += '<td>' + table[i].content + '</td>';
    div += '</table></div>';
    QUnit.config.current.assertions.push({
        result: true,
        message: div
    });
}

function svgAssertTable(inputPath, outputPath, expectedPath) {
    var row = inTd(path2svg(inputPath, 'input'))
        + inTd(path2svg(outputPath, 'output'))
        + inTd(path2svg(expectedPath, 'expected'))
        + inTd(pathList2svg([
        {d: expectedPath, cssClass: 'expected'},
        {d: outputPath, cssClass: 'output'}
    ]));
    return '<div>Geometry: <table class="svgTest"><tr><th>Input</th><th>Actual Output</th><th>Expected Output</th><th>Superposed</th></tr><tr>'
        + row + '</tr></table></div>';
}

function randomPoint() {
    return p(Math.random() * 200, Math.random() * 150);
}

function p(x, y) {
    return {x: x, y: y};
}
function pp(x, y) {
    return x + ',' + y;
}
function ppp(point) {
    return pp(point.x, point.y);
}
function point2circlePath(center, radius) {
    if (radius == null)
        radius = 4;

    return 'M' + pp((center.x - radius), center.y)
        + ' a' + pp(radius, radius) + ' 0 1,0 ' + pp(radius * 2, 0)
        + ' a' + pp(radius, radius) + ' 0 1,0 ' + pp(-radius * 2, 0);
}

function pointArray2path(points, radius) {
    var res = '';
    for (var i = 0; i < points.length; i++)
        res += point2circlePath(points[i], radius);
    return res;
}

function segments2path(segments) {
    var p = '';
    for (var i = 0; i < segments.length; i++)
        p += 'M' + ppp(segments[i][0]) + ' L' + ppp(segments[i][1]);
    return p;
}

function polygon2path(polygon) {
    var res = '';
    for (var i = 0; i < polygon.length; i++)
        res += (i == 0 ? 'M' : 'L') + ppp(polygon[i]) + ' ';
    return res + ' Z';
}

function displaySegmentsAndPoint(segments, expectedPoint, resultPoints) {
    displayMessage(svgAssertTable(segments2path(segments),
        segments2path(segments) + pointArray2path(resultPoints, 4),
        segments2path(segments) + pointArray2path(expectedPoint, 2)));
}

function displayMessage(message) {
    QUnit.config.current.assertions.push({
        result: true,
        message: message
    });
}

function cleanupIntersectionsForDisplay(intersections) {
    var res = [];
    for (var i = 0; i < intersections.length; i++)
        res.push(intersections[i][0]);
    return res;
}

test('2 segments intersections', function () {
    var s1 = [p(0, 0), p(20, 20)];
    var s2 = [p(20, 0), p(0, 20)];
    var res = intersectionSegments(s1, s2);
    var expected = {x: 10, y: 10};
    deepEqual(res, expected);
    displaySegmentsAndPoint([s1, s2], [expected], [res]);
});

test('horizontal-vertical intersection', function () {
    var s1 = [p(0, 30), p(60, 30)];
    var s2 = [p(30, 0), p(30, 60)];
    var res = [intersectionSegments(s1, s2)];
    var expected = [p(30, 30)];
    deepEqual(res, expected, 'direct computation');
    var segments = [s1, s2];
    displaySegmentsAndPoint(segments, expected, res);
    res = cleanupIntersectionsForDisplay(bentleyOttmann(segments));
    deepEqual(res, expected, 'in Bentley-Ottmann');
    displaySegmentsAndPoint(segments, expected, res);
});

test('2 almost horizontal segments intersections', function () {
    var epsilon = Math.pow(2, -50);
    var big = Math.pow(2, 52);
    var s1 = [p(1 - big, 1 - epsilon), p(1 + big, 1 + epsilon)];
    var s2 = [p(1 - big, 1 + epsilon), p(1 + big, 1 - epsilon)];
    var res = intersectionSegments(s1, s2);
    var expected = {x: 1, y: 1};
    deepEqual(res, expected);
});

test('2 almost vertical segments intersections', function () {
    var epsilon = Math.pow(2, -50);
    var big = Math.pow(2, 52);
    var s1 = [p(1 - epsilon, 1 - big), p(1 + epsilon, 1 + big)];
    var s2 = [p(1 + epsilon, 1 - big), p(1 - epsilon, 1 + big)];
    var res = intersectionSegments(s1, s2);
    var expected = {x: 1, y: 1};
    deepEqual(res, expected);
});

test('3 segments array intersections', function () {
    var s1 = [p(0, 0), p(20, 20)];
    var s2 = [p(20, 0), p(0, 20)];
    var s3 = [p(0, 10), p(10, 20)];
    var segments = [s1, s2, s3];
    var res = createIntersections(segments);
    var expected = [
        [p(10, 10), [s1, s2]],
        [p(5, 15), [s2, s3]]
    ];
    deepEqual(res, expected);
    expected = cleanupIntersectionsForDisplay(expected);
    res = cleanupIntersectionsForDisplay(res);
    displaySegmentsAndPoint(segments, res, expected);
});

test('initialization of event queue', function () {
    var expected = [p(0, 0), p(0, 10), p(0, 20), p(10, 20), p(20, 0), p(20, 20)];
    var s1 = [expected[0], expected[5]];
    var s2 = [expected[4], expected[2]];
    var s3 = [expected[1], expected[3]];
    var segments = [s1, s2, s3];
    var queue = initialPopulationOfQueue(segments);
    var res = [];
    ok(!queue.isEmpty(), 'queue is not empty');
    while (!queue.isEmpty())
        res.push(queue.fetchFirst().point);
    deepEqual(res, expected, 'events in correct order');
    ok(queue.isEmpty(), 'queue is empty after dumping the events');
    displaySegmentsAndPoint(segments, res, expected);
});

test('adding event to queue', function () {
    var expected = [p(0, 0), p(0, 20), p(10, 20), p(20, 20)];
    var s1 = [expected[0], expected[3]];
    var segments = [s1];
    var queue = initialPopulationOfQueue(segments);
    queue.pushIntersectionEvent({point: expected[2]});
    queue.pushIntersectionEvent({point: expected[1]});
    var res = [];
    ok(!queue.isEmpty(), 'queue is not empty');
    while (!queue.isEmpty())
        res.push(queue.fetchFirst().point);
    deepEqual(res, expected, 'events in correct order');
    ok(queue.isEmpty(), 'queue is empty after dumping the events');
    displaySegmentsAndPoint(segments, res, expected);
});

test('adding left events to beam', function () {
    var s1 = [p(0, 0), p(20, 20)];
    var s2 = [p(20, 0), p(0, 20)];
    var s3 = [p(0, 10), p(5, 10)];
    var segments = [s1, s2, s3];
    var res = bentleyOttmann(segments);
    var expected = [p(10, 10)];
    res = cleanupIntersectionsForDisplay(res);
    deepEqual(res, expected);
    displaySegmentsAndPoint(segments, expected, res);
});

test('beam 2 segments step by step checking', function () {
    var s1 = [p(0, 0), p(20, 20)];
    var s2 = [p(20, 0), p(0, 20)];
    var queue = createMockEventQueue([]);
    var beam = createMockScanBeam();
    beam.leftPoint(s1[0], s1, queue);
    beam.leftPoint(s2[1], s2, queue);
    var segments = [s1, s2];
    deepEqual(beam.dumpBeam(), segments, 'beam contains [s1, s2]');
    deepEqual(queue.dumpQueue()[0].point, p(10, 10), 'queue event point is correct');
    deepEqual(queue.dumpQueue()[0].type, 'intersection', 'queue event type is correct');
    deepEqual(queue.dumpQueue()[0].segments, segments, 'queue intersection event segments is correct');
    beam.intersectionPoint(p(10, 10), segments, queue);
    deepEqual(beam.dumpBeam(), [s2, s1], 'beam contains [s1, s2]');
    var expected = [
        [
            p(10, 10),
            segments
        ]
    ];
    deepEqual(beam.getResult(), expected, 'correct beam reults');
    beam.rightPoint(s2[0], s2, queue);
    deepEqual(beam.dumpBeam(), [s1], 'beam contains [s1]');
    beam.rightPoint(s1[1], s1, queue);
    deepEqual(beam.dumpBeam(), [], 'beam is empty');
    var result = beam.getResult();
    deepEqual(result, expected, 'correct beam reults');
    displaySegmentsAndPoint(segments, cleanupIntersectionsForDisplay(expected), cleanupIntersectionsForDisplay(result));
});

test('beam 4 segments; intersection masked by intersection', function () {
    var s1 = [p(0, 0), p(20, 20)];
    var s2 = [p(20, 0), p(0, 20)];
    var s3 = [p(7.5, 5), p(20, 5)];
    var s4 = [p(7.5, 15), p(20, 15)];
    var segments = [s1, s2, s3, s4];
    var res = bentleyOttmann(segments);
    var expected = [p(10, 10), p(15, 5), p(15, 15)];
    res = cleanupIntersectionsForDisplay(res);
    deepEqual(res, expected, 'same intersections as expected');
    displaySegmentsAndPoint(segments, expected, res);
});

test('beam 3 segments; intersection masked by right segment', function () {
    var s1 = [p(5, 0), p(20, 20)];
    var s2 = [p(20, 0), p(5, 20)];
    var s3 = [p(0, 10), p(10, 10)];
    var segments = [s1, s2, s3];
    var res = bentleyOttmann(segments);
    var expected = [p(12.5, 10)];
    res = cleanupIntersectionsForDisplay(res);
    deepEqual(res, expected, 'same intersection as expected');
    displaySegmentsAndPoint(segments, expected, res);
});

test('beam 3 segments; intersecting beam comes late', function () {
    var s1 = [p(0, 0), p(200, 110)];
    var s2 = [p(0, 150), p(150, 90)];
    var s3 = [p(50, 100), p(200, 100)];
    var segments = [s1, s2, s3];
    var res = bentleyOttmann(segments);
    var expected = [p(125, 100), p(181.8181818181818, 100)];
    res = cleanupIntersectionsForDisplay(res);
    deepEqual(res, expected, 'same intersections as expected');
    displaySegmentsAndPoint(segments, expected, res);
});

test('eventQueue prevents double insertion', function () {
    var s1 = [p(0, 0), p(20, 20)];
    var s2 = [p(20, 0), p(0, 20)];
    var queue = createMockEventQueue([]);
    var event = {type: 'intersection', point: p(10, 10), segments: [s1, s2]};
    queue.pushIntersectionEvent(event);
    deepEqual(queue.dumpQueue(), [event]);
    queue.pushIntersectionEvent({type: 'intersection', point: p(10, 10), segments: [s1, s2]});
    deepEqual(queue.dumpQueue(), [event]);
});

test('small random segment batch O(n^2) intersections against mock Bentley Ottmann', function () {
    var segments = [];
    for (var i = 0; i < 30; i++)
        segments.push([randomPoint(), randomPoint()]);
    var expected = cleanupIntersectionsForDisplay(createIntersections(segments));
    var res = cleanupIntersectionsForDisplay(bentleyOttmann(segments));
    expected.sort(comparePoint);
    res.sort(comparePoint);
    displaySegmentsAndPoint(segments, expected, res);
    deepEqual(res.length, expected.length, 'same number of points as expected');
    deepEqual(res, expected, 'intersections are equal');
});

test('big random segment batch O(n^2) intersections against mock Bentley Ottmann', function () {
    var segments = [];
    for (var i = 0; i < 300; i++)
        segments.push([randomPoint(), randomPoint()]);
    var expected = cleanupIntersectionsForDisplay(createIntersections(segments));
    var res = cleanupIntersectionsForDisplay(bentleyOttmann(segments));
    expected.sort(comparePoint);
    res.sort(comparePoint);
    deepEqual(res.length, expected.length, 'same number of points as expected');
    deepEqual(res, expected, 'intersections are equal');
});

test('rectangle', function () {
    var polygon = [p(10, 10), p(100, 10), p(100, 150), p(10, 150), p(10, 10)];
    displayMessage(svgAssertTable(polygon2path(polygon), '', ''));
});

test('intersection of rays', function () {
    var polygon = [
        p(10, 10),
        p(100, 10),
        p(150, 60),
        p(150, 100),
        p(100, 140),
        p(20, 150),
        p(10, 140)
        //, p(15, 100)//reflex
    ];
    var p2 = [
        [326, 361],
        [361, 300],
        [397, 258],
        [457, 225],
        [490, 235],
        [522, 255],
        [564, 308],
        [606, 373],
        [575, 426],
        [540, 464],
        [465, 503],
        [439, 510],
        [367, 475],
        [348, 438]
    ];
    var polygon2 = [];
    for (var i = 0; i < p2.length; i++) {
        polygon2.push(p((p2[i][0] - 326) / 2, (p2[i][1] - 220) / 2));
    }
    polygon = polygon2;
    var bisectors = [];
    var points = [];
    var skel = [];
    var remainingBisectors = [];
    var remainingOrigins = [];

    var area = signedArea(polygon);

    function createBisectorRay(origin, previousEdge, nextEdge) {
        var bPoint = bisectorPointForEdges(previousEdge, nextEdge, origin);
        return {origin: origin, direction: bPoint, previousEdge: previousEdge, nextEdge: nextEdge};
    }

    function createLinkedList(content) {
        var val = null;
        for (var i = 0; i < content.length; i++) {
            var bucket = {val: content[i], next: null, prev: null};
            if (val == null) {
                val = bucket;
                bucket.next = bucket;
                bucket.prev = bucket;
            } else {
                bucket.next = val.next;
                val.next = bucket;
                bucket.next.prev = bucket;
                bucket.prev = val;
                val = bucket;
            }
        }

        return {
            //if handler returns a value, the current bucket will take this value and the next bucket will be deleted and skipped.
            iterate: function (handler) {
                if (val == null)
                    return;
                var currentBucket = val;
                do {
                    handler(currentBucket);
                    currentBucket = currentBucket.next;
                } while (currentBucket != val);
            },
            remove: function (bucket) {
                if (val == bucket) {
                    if (val.next == bucket) {
                        val = null;
                        return;
                    }
                    val = val.next;
                }
                bucket.prev.next = bucket.next;
                bucket.next.prev = bucket.prev;
            },
            isEmpty: function () {
                return val != null;
            }
        }
    }

    function isReflexVertex(vertex, previousVertex, nextVertex, polygonArea) {
        return signedArea([previousVertex, vertex, nextVertex]) * polygonArea < 0;
    }

    var reflexPoints = [];
    for (var i = 0; i < polygon.length; i++) {
        var previousPoint = polygon[(i + polygon.length - 1) % polygon.length];
        var point = polygon[i];
        if (!previousPoint.nextEdge)
            previousPoint.nextEdge = [previousPoint, point];
        var nextPoint = polygon[(i + 1) % polygon.length];
        if (!point.nextEdge)
            point.nextEdge = [point, nextPoint];
        if (isReflexVertex(point, previousPoint, nextPoint, area)) {
            point.reflex = true;
            reflexPoints.push(point);
        } else
            bisectors.push(createBisectorRay(point, previousPoint.nextEdge, point.nextEdge));
    }
    svgDisplayTable([
        {label: 'reflex points', content: pathList2svg([
            {d: polygon2path(polygon) + pointArray2path(reflexPoints)}
        ])}
    ]);
    var bisectorList = createLinkedList(bisectors);

    function run2() {
        var stop = false;
        var newSkel = [];
        remainingBisectors = [];
        remainingOrigins = [];
        bisectorList.iterate(function (currentBucket) {
            var previous = currentBucket.prev.val;
            var current = currentBucket.val;
            var next = currentBucket.next.val;
            var previousSegment = [previous.origin, previous.direction];
            var currentSegment = [current.origin, current.direction];
            var nextSegment = [next.origin, next.direction];
            var previousIntersection = intersectionSegments(previousSegment, currentSegment, true);
            var nextIntersection = intersectionSegments(currentSegment, nextSegment, true);
            current.behind = segLength([current.origin, previousIntersection]);
            current.ahead = segLength([current.origin, nextIntersection]);
            current.aheadPoint = nextIntersection;
            remainingBisectors.push([current.origin, current.direction]);
            remainingOrigins.push(current.origin);
        });
        var deleteList = [];
        points = [];
        bisectorList.iterate(function (currentBucket) {
            var previous = currentBucket.prev.val;
            var current = currentBucket.val;
            var next = currentBucket.next.val;
            if (previous == next) {
                newSkel.push([current.origin, next.origin]);
                stop = true;
            } else if (currentBucket.next.next == currentBucket.prev) {
                newSkel.push([current.origin, current.aheadPoint]);
                stop = true;
            } else if (current.behind >= current.ahead && next.ahead >= next.behind) {
                var intersectionPoint = current.aheadPoint;
                var prevSegment = current.previousEdge;
                var nextSegment = next.nextEdge;
                var sqRadius = Math.min(distToSegmentSquared(intersectionPoint, prevSegment), distToSegmentSquared(intersectionPoint, nextSegment));
                for (var i = 0; i < polygon.length; i++) {
                    if (distToSegmentSquared(intersectionPoint, polygon[i].nextEdge) < sqRadius)
                        return;
                }
                newSkel.push([current.origin, intersectionPoint]);
                newSkel.push([next.origin, intersectionPoint]);
                points.push(intersectionPoint);
                deleteList.push([currentBucket, createBisectorRay(intersectionPoint, prevSegment, nextSegment)]);
            }
        });
        for (var i = 0; i < deleteList.length; i++) {
            var bucket = deleteList[i][0];
            bucket.val = deleteList[i][1];
            bisectorList.remove(bucket.next);
        }
        skel.push.apply(skel, newSkel);
        svgDisplayTable([
            {label: 'rays', content: pathList2svg([
                {d: polygon2path(polygon) + segments2path(remainingBisectors) + pointArray2path(remainingOrigins) + pointArray2path(points, 2)}
            ])},
            {label: 'new skeleton', content: pathList2svg([
                {d: polygon2path(polygon) + segments2path(newSkel)}
            ])},
            {label: 'skeleton', content: pathList2svg([
                {d: polygon2path(polygon) + segments2path(skel)}
            ])}
        ]);
        return !bisectorList.isEmpty() || stop;
    }

    var startCount = 10;
    while (!run2() && startCount--);

    console.log(skel);
});