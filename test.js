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

test('test1', function () {
  var inputPath = 'M10,10L20,10L20,20L10,20L10,10Z';
  var outputPath = 'M10,10L20,10L20,20L10,20L10,10Z';
  var expectedPath = 'M10,10L20,10L20,20L10,20L10,10Z';
  equal(outputPath, expectedPath);
  QUnit.config.current.assertions.push({
    result: true,
    message: svgAssertTable(inputPath, outputPath, expectedPath)
  });
});

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

test('2 segments intersections', function () {
  var s1 = [p(0, 0), p(20, 20)];
  var s2 = [p(20, 0), p(0, 20)];
  var res = intersectionSegments(s1, s2);
  var expected = {x: 10, y: 10};
  deepEqual(res, expected);
  displaySegmentsAndPoint([s1, s2], [expected], [res]);
});

test('3 segments array intersections', function () {
  var s1 = [p(0, 0), p(20, 20)];
  var s2 = [p(20, 0), p(0, 20)];
  var s3 = [p(0, 10), p(10, 20)];
  var segments = [s1, s2, s3];
  var res = createIntersections(segments);
  var expected = [
    {x: 10, y: 10},
    {x: 5, y: 15}
  ];
  deepEqual(res, expected);
  displaySegmentsAndPoint(segments, res, expected);
});

function randomPoint() {
  return p(Math.random() * 200, Math.random() * 150);
}
test('random segments O(n^2) intersections', function () {
  var segments = [];
  for (var i = 0; i < 50; i++)
    segments.push([randomPoint(), randomPoint()]);
  var res = createIntersections(segments);
  var expected = [];
  displaySegmentsAndPoint(segments, res, expected);
});

test('initialization of event queue', function () {
  var expected = [p(0, 0), p(0, 10), p(0, 20), p(10, 20), p(20, 0), p(20, 20)];
  var s1 = [expected[0], expected[5]];
  var s2 = [expected[4], expected[2]];
  var s3 = [expected[1], expected[3]];
  var segments = [s1, s2, s3];
  var queue = createIntersectionsBentley(segments);
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
  var queue = createIntersectionsBentley(segments);
  queue.push({point: expected[2]});
  queue.push({point: expected[1]});
  var res = [];
  ok(!queue.isEmpty(), 'queue is not empty');
  while (!queue.isEmpty())
    res.push(queue.fetchFirst().point);
  deepEqual(res, expected, 'events in correct order');
  ok(queue.isEmpty(), 'queue is empty after dumping the events');
  displaySegmentsAndPoint(segments, res, expected);
});