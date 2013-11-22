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

test('2 segments intersections', function () {
  var s1 = [p(0, 0), p(20, 20)];
  var s2 = [p(20, 0), p(0, 20)];
  var res = intersectionSegments(s1, s2);
  var expected = {x: 10, y: 10};
  deepEqual(res, expected);
  var message = svgAssertTable(segments2path([s1, s2]),
      segments2path([s1, s2]) + point2circlePath(res),
      segments2path([s1, s2]) + point2circlePath(expected));
  QUnit.config.current.assertions.push({
    result: true,
    message: message
  });
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
  var message = svgAssertTable(segments2path(segments),
      segments2path(segments) + pointArray2path(res),
      segments2path(segments) + pointArray2path(expected));
  QUnit.config.current.assertions.push({
    result: true,
    message: message
  });
});