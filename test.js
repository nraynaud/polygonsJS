function pathList2svg(path) {
  var content = '';
  for (var i = 0; i < path.length; i++) {
    content += '<path class="' + path[i].cssClass + '" d="' + path[i].d + '"/>\n';
  }
  return '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150">' + content + '</svg>';
}

function path2svg(path, cssClass) {
  var pathElement = '<path class="' + cssClass + '" d="' + path + '"/>';
  return '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150">' + pathElement + '</svg>';
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
  var outputPath = 'M10,10L20,10L20,30L10,20L10,10Z';
  var expectedPath = 'M10,10L20,10L20,20L10,20L10,10Z';
  equal(outputPath, expectedPath);
  QUnit.config.current.assertions.push({
    result: true,
    message: svgAssertTable(inputPath, outputPath, expectedPath)
  });
});