"use strict";
function pointOnParabola(t, directrix, focus) {
    // http://alecmce.com/category/math
    var directrixVector = {x: directrix[0].x - directrix[1].x, y: directrix[0].y - directrix[1].y};
    var pt = {x: directrix[0].x * (1 - t) + directrix[1].x * t, y: directrix[0].y * (1 - t) + directrix[1].y * t};
    var ptToFocus = {x: focus.x - pt.x, y: focus.y - pt.y};
    var dist = sqVectorLength(ptToFocus.x, ptToFocus.y) / (2 * (directrixVector.x * ptToFocus.y - directrixVector.y * ptToFocus.x));
    if (isFinite(dist))
        return {x: pt.x - directrixVector.y * dist, y: pt.y + directrixVector.x * dist};
    return null;
}

function segmentParabola(directrix, focus) {
    var pts = [];
    for (var i = 0; i <= 1; i += 0.1) {
        var point = pointOnParabola(i, directrix, focus);
        if (point)
            pts.push(point);
    }
    return pts;
}

function createSkeletonWithDisplay(polygon) {

    function raySitesRepresentation(ray) {
        return ray.firstSite.representation() + ray.secondSite.representation();
    }

    medialAxis.ReflexVertexSite.prototype.representation = function () {
        return pointArray2path([this.vertex], 2);
    };

    medialAxis.LineSite.prototype.representation = function () {
        return polylines2path([this.segment]);
    };
    medialAxis.LinearRay.prototype.representation = function () {
        return polylines2path([(this.aheadPoint ? [this.origin, this.aheadPoint] : this.segment)]);
    };
    medialAxis.LinearRay.prototype.behindRepresentation = function () {
        return polylines2path([
            [this.behindPoint, this.origin]
        ]);
    };
    medialAxis.ParabolicRay.prototype.representation = function () {
        if (this.aheadPoint) {
            var p1 = pointProjectedOnSegment(this.aheadPoint, this.edge.segment);
            var p2 = pointProjectedOnSegment(this.origin, this.edge.segment);
            return polylines2path([segmentParabola([p1, p2], this.vertex)]);
        }
        return polylines2path([segmentParabola(this.edge.segment, this.vertex)]);
    };
    medialAxis.ParabolicRay.prototype.behindRepresentation = function () {
        var p1 = pointProjectedOnSegment(this.origin, this.edge.segment);
        var p2 = pointProjectedOnSegment(this.behindPoint, this.edge.segment);
        return p1 && p2 ? polylines2path([segmentParabola([p1, p2], this.vertex)]) : '';
    };

    var newSkelRepresentation = '';
    var currentRays = '';
    var skelPoints = [];
    var skelRepr = '';
    medialAxis.createSkeleton(polygon, {
        initialized: function (rays, reflexPoints) {
            if (reflexPoints.length)
                svgDisplayTable([
                    {label: 'reflex points', content: pathList2svg([
                        {d: polygon2path(polygon)},
                        {cssClass: 'red', d: pointArray2path(reflexPoints)}
                    ])}
                ]);
            var rayRepresentation = '';
            for (var i = 0; i < rays.length; i++)
                rayRepresentation += rays[i].representation();
            svgDisplayTable([
                {label: 'initial rays', content: pathList2svg([
                    {d: polygon2path(polygon)},
                    {cssClass: 'red', d: rayRepresentation}
                ])}
            ]);
        },
        eliminatedRadius: function (currentRay, nextRay, intersectionPoint, sqRadius, nextEdge, otherSqrDist) {
            svgDisplayTable([
                {label: 'eliminated because of radius', content: pathList2svg([
                    {cssClass: 'gray', d: polygon2path(polygon) },
                    {cssClass: 'blue', d: currentRay.representation() + raySitesRepresentation(currentRay)
                        + nextRay.representation() + pointArray2path([intersectionPoint], Math.sqrt(sqRadius))},
                    {cssClass: 'red', d: nextEdge.representation()
                        + pointArray2path([intersectionPoint], Math.sqrt(otherSqrDist))}
                ])}
            ]);
        },
        rayFused: function (previousRay, nextRay, currentRay, intersectionPoint, sqRadius, newRay) {
            newSkelRepresentation += currentRay.representation() + nextRay.behindRepresentation();
            skelPoints.push(intersectionPoint);
            svgDisplayTable([
                {label: 'selected intersection', content: pathList2svg([
                    {cssClass: 'gray', d: polygon2path(polygon) + previousRay.representation()},
                    {d: previousRay.representation()},
                    {cssClass: 'blue', d: nextRay.representation()},
                    {cssClass: 'red', d: currentRay.representation() + pointArray2path([intersectionPoint])}
                ])},
                {label: 'new ray and corresponding sites', content: pathList2svg([
                    {cssClass: 'gray', d: polygon2path(polygon)},
                    {d: raySitesRepresentation(currentRay) + currentRay.representation()},
                    {cssClass: 'blue', d: currentRay.representation() + nextRay.behindRepresentation()},
                    {cssClass: 'red', d: pointArray2path([intersectionPoint], Math.sqrt(sqRadius))
                        + raySitesRepresentation(newRay) + newRay.representation()}
                ])}
            ]);
        },
        last2raysEncountered: function (currentRay, nextRay) {
            console.log('stop 2');
            newSkelRepresentation += polylines2path([
                [currentRay.origin, nextRay.origin]
            ]);
        },
        raysIntersectionsComputed: function (rayList) {
            currentRays = '';
            skelPoints = [];
            rayList.iterate(function (currentBucket) {
                var current = currentBucket.val;
                currentRays += current.representation();
            });
        },
        stepFinished: function () {
            skelRepr += newSkelRepresentation;
            svgDisplayTable([
                {label: 'input step rays, selected intersections in red', content: pathList2svg([
                    {cssClass: 'gray', d: polygon2path(polygon)},
                    {cssClass: 'blue', d: currentRays},
                    {cssClass: 'red', d: pointArray2path(skelPoints, 2)}
                ])},
                {label: 'added skeleton parts', content: pathList2svg([
                    {cssClass: 'gray', d: polygon2path(polygon)},
                    {cssClass: 'blue', d: newSkelRepresentation}
                ])},
                {label: 'skeleton after step', content: pathList2svg([
                    {cssClass: 'gray', d: polygon2path(polygon)},
                    {cssClass: 'blue', d: skelRepr}
                ])}
            ]);
            newSkelRepresentation = '';
        }
    });
}

test('parabola', function () {
    var focus = p(50, 50);
    var directrix = [p(5, 60), p(60, 5)];

    svgDisplayTable([
        {label: 'focus directrix', content: pathList2svg([
            {d: polylines2path([directrix]) + pointArray2path([focus]) + polylines2path([segmentParabola(directrix, focus)])}
        ])}
    ]);
});

test('PLL solver non-parallel', function () {
    var s1 = [p(10, 10), p(100, 10)];
    var s2 = [p(100, 10), p(100, 140)];
    var vertex = p(40, 100);

    var result = solver.solveEquations(new solver.EquationSystemCreator().addSegment(s1).addSegment(s2).addVertex(vertex), function () {
        return true;
    });
    var resultsDisplay = '';
    for (var i = 0; i < result.length; i++) {
        var obj = result[i];
        resultsDisplay += pointArray2path([obj], obj.r);
    }
    svgDisplayTable([
        {label: 'focus directrix', content: pathList2svg([
            {cssClass: 'blue', d: polylines2path([s1, s2]) + pointArray2path([vertex])},
            {cssClass: 'red', d: pointArray2path(result, 2) + resultsDisplay
                + polylines2path([segmentParabola(s2, vertex)])
                + polylines2path([segmentParabola(s1, vertex)])}
        ])}
    ]);
});

test('PLL solver perpendicular', function () {
    var s1 = [p(10, 10), p(100, 10)];
    var s2 = [p(100, 10), p(100, 140)];
    var vertex = p(10, 10);
    var result = solver.solveEquations(new solver.EquationSystemCreator().addSegment(s1).addSegment(s2).addVertex(vertex));
    var resultsDisplay = '';
    for (var i = 0; i < result.length; i++)
        resultsDisplay += pointArray2path([result[i]], result[i].r);
    svgDisplayTable([
        {label: 'focus directrix', content: pathList2svg([
            {cssClass: 'blue', d: polylines2path([s1, s2]) + pointArray2path([vertex])},
            {cssClass: 'red', d: pointArray2path(result, 2) + resultsDisplay
                + polylines2path([segmentParabola(s2, vertex)])
                + polylines2path([segmentParabola(s1, vertex)])}
        ])}
    ]);

    s1 = [p(20, 150), p(10, 140)];
    s2 = [p(10, 140), p(10, 95) ];
    vertex = p(10, 95);

    result = solver.solveEquations(new solver.EquationSystemCreator().addSegment(s1).addSegment(s2).addVertex(vertex));
    resultsDisplay = '';
    for (i = 0; i < result.length; i++)
        resultsDisplay += pointArray2path([result[i]], result[i].r);
    svgDisplayTable([
        {label: 'focus directrix', content: pathList2svg([
            {cssClass: 'blue', d: polylines2path([s1, s2]) + pointArray2path([vertex])},
            {cssClass: 'red', d: pointArray2path(result, 2) + resultsDisplay
                + polylines2path([segmentParabola(s2, vertex)])
                + polylines2path([segmentParabola(s1, vertex)])}
        ])}
    ]);
});

test('PLL solver parallel', function () {
    var s1 = [p(10, 10), p(10, 140)];
    var s2 = [p(100, 140), p(100, 10)];
    var vertex = p(25, 100);
    var result = solver.solveEquations(new solver.EquationSystemCreator().addSegment(s1).addSegment(s2).addVertex(vertex));
    var resultsDisplay = '';
    for (var i = 0; i < result.length; i++)
        resultsDisplay += pointArray2path([result[i]], result[i].r);
    svgDisplayTable([
        {label: 'edges and circle', content: pathList2svg([
            {cssClass: 'blue', d: polylines2path([s1, s2]) + pointArray2path([vertex])},
            {cssClass: 'red', d: pointArray2path(result) + resultsDisplay + polylines2path([segmentParabola(s2, vertex)]) + polylines2path([segmentParabola(s1, vertex)])}
        ])}
    ]);
    deepEqual(result, [
        {x: 55, y: 133.54101966249684, r: -45},
        {x: 55, y: 66.45898033750316, r: -45}
    ]);
});

test('PLL solver point on side', function () {
    var s1 = [p(10, 10), p(10, 140)];
    var s2 = [p(100, 140), p(100, 10)];
    var vertex = p(10, 50);
    var result = solver.solveEquations(new solver.EquationSystemCreator().addSegment(s1).addSegment(s2).addVertex(vertex));
    var resultsDisplay = '';
    for (var i = 0; i < result.length; i++) {
        var obj = result[i];
        resultsDisplay += pointArray2path([obj], obj.r);
    }
    svgDisplayTable([
        {label: 'edges and circle', content: pathList2svg([
            {cssClass: 'blue', d: polylines2path([s1, s2]) + pointArray2path([vertex])},
            {cssClass: 'red', d: pointArray2path(result) + resultsDisplay + polylines2path([segmentParabola(s2, vertex)]) + polylines2path([segmentParabola(s1, vertex)])}
        ])}
    ]);
    deepEqual(result, [
        {x: 55, y: 50, r: -45}
    ])
});

test('PLL solver unstable', function () {
    var factor = 1;
    var s1 = [p(30 / factor, 100 / factor), p(10 / factor, 10 / factor)];
    var s2 = [p(100 / factor, 10 / factor), p(50 / factor, 65 / factor)];
    var vertex = p(50 / factor, 65 / factor);
    var result = solver.solveEquations(new solver.EquationSystemCreator().addSegment(s1).addSegment(s2).addVertex(vertex));
    var resultsDisplay = '';
    for (var i = 0; i < result.length; i++) {
        var obj = result[i];
        resultsDisplay += pointArray2path([obj], obj.r);
    }
    deepEqual(result.length, 1);
    svgDisplayTable([
        {label: 'edges and circle', content: pathList2svg([
            {cssClass: 'blue', d: polylines2path([s1, s2]) + pointArray2path([vertex])},
            {cssClass: 'red', d: pointArray2path(result) + resultsDisplay + polylines2path([segmentParabola(s1, vertex)]) + polylines2path([segmentParabola(s1, vertex)])}
        ])}
    ]);
});

test('LLL solver', function () {
    var s1 = [p(10, 10), p(100, 10)];
    var s2 = [p(100, 10), p(100, 140)];
    var s3 = [p(100, 140), p(10, 140)];

    var result = solver.solveEquations(new solver.EquationSystemCreator().addSegment(s1).addSegment(s2).addSegment(s3));
    svgDisplayTable([
        {label: 'edges and circle', content: pathList2svg([
            {cssClass: 'blue', d: polylines2path([s1, s2, s3])},
            {cssClass: 'red', d: pointArray2path(result, result[0].r)}
        ])}
    ]);
    deepEqual(result, [
        {x: 35, y: 75, r: 65}
    ]);
});

test('LLL solver with flat vertex', function () {
    var flatVertex = p(50, 10);
    var v1 = p(10, 10);
    var v2 = p(100, 10);
    var v3 = p(100, 140);
    var s1 = [v1, flatVertex];
    var s2 = [flatVertex, v2];
    var s3 = [v2, v3];
    var result = solver.solveEquations(new solver.EquationSystemCreator().addSegment(s1).addSegment(s2).addSegment(s3));
    svgDisplayTable([
        {label: 'edges and circle', content: pathList2svg([
            {cssClass: 'blue', d: polylines2path([s1, s2, s3]) + pointArray2path([v1, flatVertex, v2, v3])},
            {cssClass: 'red', d: pointArray2path(result, result[0].r)}
        ])}
    ]);
    deepEqual(result, [
        {x: 50, y: 60, r: 50}
    ]);
});
test('medial axis1, 3 reflex points', function () {
    createSkeletonWithDisplay([
        p(10, 10),
        p(100, 10),
        p(50, 65),
        p(100, 140),
        p(40, 100),
        p(10, 140),
        p(20, 100)
    ]);
});
test('medial axis2, 1 reflex point', function () {
    createSkeletonWithDisplay([
        p(10, 10),
        p(100, 10),
        p(100, 140),
        p(40, 100),
        p(10, 140)
    ]);
});


test('medial axis3, convex polygon', function () {
    createSkeletonWithDisplay([
        p(10, 10),
        p(100, 10),
        p(150, 60),
        p(150, 100),
        p(100, 140),
        p(20, 150),
        p(10, 140)
    ]);
});

test('medial axis4, rectangle', function () {
    createSkeletonWithDisplay([
        p(10, 10),
        p(100, 10),
        p(100, 140),
        p(10, 140)
    ]);
});

test('medial axis5, convex polygon', function () {

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
    createSkeletonWithDisplay(polygon2);
});

test('medial axis6, rectangle with flat vertices', function () {
    createSkeletonWithDisplay([
        p(10, 10),
        p(100, 10),
        p(100, 20),
        p(100, 30),
        p(100, 40),
        p(100, 50),
        p(100, 60),
        p(100, 100),
        p(100, 140),
        p(10, 140),
        p(10, 60),
        p(10, 50),
        p(10, 40),
        p(10, 30),
        p(10, 20)
    ]);
});

test('snake', function () {
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
    createSkeletonWithDisplay(poly);
});

test('cut square with hole', function () {
    createSkeletonWithDisplay([
        p(10, 10),
        p(10, 110),
        p(110, 110),
        p(110, 60),
        p(100, 60),
        p(100, 100),
        p(20, 100),
        p(20, 20),
        p(100, 20),
        p(100, 60),
        p(110, 60),
        p(110, 10)
    ]);
});
