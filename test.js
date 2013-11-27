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

function svgAssertTable(inputPath, outputPath, expectedPath) {
  var row = inTd(path2svg(inputPath, 'input'))
      + inTd(path2svg(outputPath, 'output'))
      + inTd(path2svg(expectedPath, 'expected'))
      + inTd(pathList2svg([
    {d: expectedPath, cssClass: 'expected'},
    {d: outputPath, cssClass: 'output'}
  ]));
  return '<div>Geometry: <table class="svgTest"><tr><th>input</th><th>output</th><th>expected</th><th>superposed</th></tr><tr>'
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

function displaySegmentsAndPoint(segments, expectedPoint, resultPoints) {
  var message = svgAssertTable(segments2path(segments),
      segments2path(segments) + pointArray2path(resultPoints, 4),
      segments2path(segments) + pointArray2path(expectedPoint, 2));
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
  var res = intersectionSegments(s1, s2);
  var expected = {x: 30, y: 30};
  deepEqual(res, expected);
  displaySegmentsAndPoint([s1, s2], [expected], [res]);
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
    [
      {x: 10, y: 10},
      [s1, s2]
    ],
    [
      {x: 5, y: 15},
      [s2, s3]
    ]
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

test('beam 2 segments', function () {
  var s1 = [p(0, 0), p(20, 20)];
  var s2 = [p(20, 0), p(0, 20)];
  var queue = createMockEventQueue([]);
  var beam = createMockScanBeam();
  beam.leftPoint(s1[0], s1, queue);
  beam.leftPoint(s2[1], s2, queue);
  deepEqual(beam.dumpBeam(), [s1, s2]);
  deepEqual(queue.dumpQueue(), [
    {type: 'intersection', point: p(10, 10), segments: [s1, s2]}
  ]);
  beam.intersectionPoint(p(10, 10), [s1, s2], queue);
  deepEqual(beam.dumpBeam(), [s2, s1]);
  deepEqual(beam.getResult(), [
    [
      p(10, 10),
      [s1, s2]
    ]
  ]);
  beam.rightPoint(s2[0], s2, queue);
  deepEqual(beam.dumpBeam(), [s1]);
  beam.rightPoint(s1[1], s1, queue);
  deepEqual(beam.dumpBeam(), []);
  deepEqual(beam.getResult(), [
    [
      {x: 10, y: 10},
      [s1, s2]
    ]
  ]);
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
  deepEqual(res, expected);
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
  deepEqual(res, expected);
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
  deepEqual(res, expected);
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
