"use strict";


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

test('point In Polygon', function () {
    var poly = [p(458, 39),
        p(458, 39),
        p(395, 46),
        p(308, 76),
        p(141, 64),
        p(100, 80),
        p(234, 89),
        p(343, 99),
        p(400, 115),
        p(405, 66),
        p(423, 50),
        p(419, 135),
        p(378, 205),
        p(337, 201),
        p(72, 185),
        p(73, 205),
        p(306, 213),
        p(375, 226),
        p(412, 261),
        p(343, 326),
        p(233, 330),
        p(74, 344),
        p(57, 316),
        p(133, 290),
        p(290, 291),
        p(366, 232),
        p(296, 222),
        p(172, 246),
        p(41, 214),
        p(35, 178),
        p(197, 171),
        p(350, 194),
        p(398, 140),
        p(326, 117),
        p(155, 92),
        p(28, 138),
        p(22, 71),
        p(113, 52),
        p(277, 64),
        p(326, 35),
        p(391, 25),
        p(456, 23),
        p(498, 15)
    ];
    for (var i = 0; i < poly.length; i++) {
        var point = poly[i];
        point.x /= 2.5;
        point.y /= 2.5;
    }

    var testPoint = {"x": 114.01865740403706, "y": 160.8977133216299};
    equal(pointInPolygon(testPoint, poly), false);
});