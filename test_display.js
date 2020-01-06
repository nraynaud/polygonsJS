"use strict";

function pathList2svg(paths, test_display_viewBox) {
    var content = '';
    for (var i = 0; i < paths.length; i++)
        content += '<path class="' + paths[i].cssClass + '" d="' + paths[i].d + '"/>\n';
    var viewBox = test_display_viewBox ? ' viewBox="' + test_display_viewBox + '"' : '';
    return '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150"' + viewBox + '>' + content + '</svg>';
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
        if (points[i])
            res += point2circlePath(points[i], radius);
    return res;
}

function polylines2path(segments) {
    var p = '';
    for (var i = 0; i < segments.length; i++) {
        if (segments[i] && segments[i].length) {
            p += 'M' + ppp(segments[i][0]);
            for (var j = 1; j < segments[i].length; j++)
                p += ' L' + ppp(segments[i][j]);
        }
    }
    return p;
}

function polygon2path(polygon) {
    var res = '';
    for (var i = 0; i < polygon.length; i++)
        res += (i == 0 ? 'M' : 'L') + ppp(polygon[i]) + ' ';
    return res + ' Z';
}

function displaySegmentsAndPoint(segments, expectedPoints, resultPoints) {
    displayMessage(svgAssertTable(polylines2path(segments),
        polylines2path(segments) + pointArray2path(resultPoints, 4),
        polylines2path(segments) + pointArray2path(expectedPoints, 2)));
}

function displayMessage(message) {
    QUnit.config.current.assertions.push({
        result: true,
        message: message
    });
}