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

function raySitesRepresentation(ray) {
    return ray.firstSite.representation() + ray.secondSite.representation();
}

function pointProjectsOnSegments(segments, point) {
    for (var j = 0; j < segments.length; j++)
        if (!pointProjectedOnSegment(point, segments[j]) || pointEquals(point, segments[j][0]) || pointEquals(point, segments[j][1]))
            return false;
    return true;
}

/**
 * @param origin
 * @param direction
 * @param firstSite
 * @param secondSite
 * @param [candidateFilter]
 * @constructor
 */
function LinearRay(origin, direction, firstSite, secondSite, candidateFilter) {
    this.origin = origin;
    this.segment = [origin, direction];
    this.firstSite = firstSite;
    this.secondSite = secondSite;
    this.filterPointCandidate = candidateFilter ? candidateFilter : function () {
        return true;
    };
}

LinearRay.prototype = {
    behindRepresentation: function () {
        return polylines2path([
            [this.behindPoint, this.origin]
        ]);
    }
};

function ParabolicRay(vertexSite, edgeSite, origin, firstSite, secondSite) {
    this.origin = origin;
    this.vertex = vertexSite;
    this.edge = edgeSite;
    this.firstSite = firstSite;
    this.secondSite = secondSite;
}

ParabolicRay.prototype = {
    behindRepresentation: function () {
        var p1 = pointProjectedOnSegment(this.origin, this.edge.segment);
        var p2 = pointProjectedOnSegment(this.behindPoint, this.edge.segment);
        return p1 && p2 ? polylines2path([segmentParabola([p1, p2], this.vertex)]) : '';
    },
    filterPointCandidate: function (point) {
        return pointProjectsOnSegments([this.edge.segment], point);
    }
};

function createSkeleton(polygon, observers) {
    observers = observers ? observers : {};
    var area = signedArea(polygon);

    function reversedSegment(segment) {
        return [segment[1], segment[0]];
    }

    function setIntersection(targetRay, intersectionPoint, nextRay) {
        function intersectionDistance(intersection, vertex) {
            if (intersection) {
                var len = segLength([intersection, vertex]);
                return  len == 0 ? Infinity : len;
            } else
                return Infinity;
        }

        targetRay.ahead = intersectionDistance(intersectionPoint, targetRay.origin);
        nextRay.behind = intersectionDistance(intersectionPoint, nextRay.origin);
        nextRay.behindPoint = intersectionPoint;
        targetRay.aheadPoint = intersectionPoint;
        targetRay.nextRay = nextRay;
    }

    function fuseRay(ray) {
        return ray.nextRay.secondSite.igniteRayWithPreviousSite(ray.firstSite, ray.aheadPoint);
    }

    function intersectNextRay(current, next) {
        if (current.nextRay == next)
            return;
        var result;
        var rejectedPointsProjection = [];
        var rejectedPoint2 = [];
        if (current.neverIntersects == next || next.neverIntersects == current)
            result = [];
        else {
            var eq = new EquationSystemCreator();
            current.firstSite.dropEquation(eq);
            current.secondSite.dropEquation(eq);
            next.secondSite.dropEquation(eq);
            result = solveEquations(eq, function (point) {
                var result1 = current.filterPointCandidate(point) && next.filterPointCandidate(point);
                var result2 = pointInPolygon(point, polygon);
                var result = result1 && result2;
                if (!result1)
                    rejectedPointsProjection.push(point);
                if (!result2)
                    rejectedPoint2.push(point);
                return result;
            });

        }
        setIntersection(current, result[0], next);
    }

    function getCoveredSites(ray) {
        return  ray.firstSite.coveredEdges().concat(ray.secondSite.coveredEdges());
    }

    function igniteVertexSegment(vertexSite, lineSite, origin, firstSite, secondSite) {
        var segment = lineSite.segment;
        if (segment[1] == vertexSite.vertex || segment[0] == vertexSite.vertex)
            return new LinearRay(vertexSite.vertex, perpendicularPoint(vertexSite.vertex, segment), firstSite, secondSite);
        return new ParabolicRay(vertexSite.vertex, lineSite, origin, firstSite, secondSite);
    }

    function LineSite(segment) {
        this.segment = segment;
    }

    LineSite.prototype = {
        dropEquation: function (equationCreator) {
            return equationCreator.addSegment(this.segment);
        },
        igniteRayWithPreviousSite: function (previousSite, origin) {
            return previousSite.igniteRayWithLineSite(this, origin);
        },
        igniteRayWithLineSite: function (followingLineSite, origin, edgesIntersection) {
            if (edgesIntersection == null) {
                edgesIntersection = intersectionSegments(this.segment, followingLineSite.segment, true);
                if (edgesIntersection == null || !isFinite(edgesIntersection.x) || !isFinite(edgesIntersection.y))
                    edgesIntersection = origin;
            }
            var bVector = bisectorVectorFromSegments(reversedSegment(this.segment), followingLineSite.segment);
            var bPoint = {x: edgesIntersection.x + bVector.x, y: edgesIntersection.y + bVector.y};
            var segment1 = this.segment;
            return new LinearRay(origin, bPoint, this, followingLineSite, function (point) {
                return pointProjectsOnSegments([segment1], point);
            });
        },
        igniteRayWithReflexVertexSite: function (followingVertexSite, origin) {
            return igniteVertexSegment(followingVertexSite, this, origin, this, followingVertexSite);
        },
        sqDistanceFromPoint: function (point) {
            return distToSegmentSquared(point, this.segment);
        },
        representation: function () {
            return polylines2path([this.segment]);
        },
        coveredEdges: function () {
            return [this];
        }
    };

    function ReflexVertexSite(vertex, previousEdge, nextEdge) {
        this.vertex = vertex;
        this.previousEdge = previousEdge;
        this.nextEdge = nextEdge;
    }

    ReflexVertexSite.prototype = {
        dropEquation: function (equationCreator) {
            return equationCreator.addVertex(this.vertex);
        },
        igniteRayWithPreviousSite: function (previousSite, origin) {
            return previousSite.igniteRayWithReflexVertexSite(this, origin);
        },
        igniteRayWithLineSite: function (followingLineSite, origin) {
            return igniteVertexSegment(this, followingLineSite, origin, this, followingLineSite);
        },
        igniteRayWithReflexVertexSite: function (nextSite, origin) {
            return new LinearRay(origin, perpendicularPoint(origin, [this.vertex, nextSite.vertex]), this, nextSite);
        },
        ignitePerpendicularRays: function () {
            var ray1 = this.previousEdge.igniteRayWithReflexVertexSite(this);
            var ray2 = this.igniteRayWithLineSite(this.nextEdge, this.vertex);
            ray1.neverIntersects = ray2;
            ray2.neverIntersects = ray1;
            return [ray1, ray2];
        },
        representation: function () {
            return pointArray2path([this.vertex], 2);
        },
        coveredEdges: function () {
            return [this.previousEdge, this.nextEdge];
        }
    };

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
            //if handler returns true value, we break the loop
            iterate: function (handler) {
                if (val == null)
                    return;
                var currentBucket = val;
                do {
                    if (handler(currentBucket))
                        break;
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
                return val == null;
            }
        }
    }

    function isReflexVertex(vertex, previousVertex, nextVertex, polygonArea) {
        return signedArea([previousVertex, vertex, nextVertex]) * polygonArea < 0;
    }

    function createInitialRays() {
        var rays = [];
        var reflexPoints = [];
        for (var i = 0; i < polygon.length; i++) {
            var previousPoint = polygon[(i + polygon.length - 1) % polygon.length];
            var vertex = polygon[i];
            if (!previousPoint.nextEdge)
                previousPoint.nextEdge = new LineSite([previousPoint, vertex]);
            var nextPoint = polygon[(i + 1) % polygon.length];
            if (!vertex.nextEdge)
                vertex.nextEdge = new LineSite([vertex, nextPoint]);
            if (isReflexVertex(vertex, previousPoint, nextPoint, area)) {
                vertex.reflex = true;
                reflexPoints.push(vertex);
                var reflexVertexSite = new ReflexVertexSite(vertex, previousPoint.nextEdge, vertex.nextEdge);
                Array.prototype.push.apply(rays, reflexVertexSite.ignitePerpendicularRays());
            } else
                rays.push(previousPoint.nextEdge.igniteRayWithLineSite(vertex.nextEdge, vertex, vertex));
        }
        if (observers['initialized'])
            observers['initialized'](rays, reflexPoints);
        return rays;
    }

    var rayList = createLinkedList(createInitialRays());

    function run(rayList) {
        var stop = false;
        var hasMoved = false;
        rayList.iterate(function (currentBucket) {
            var current = currentBucket.val;
            var next = currentBucket.next.val;
            intersectNextRay(current, next);
        });
        if (observers['raysIntersectionsComputed'])
            observers['raysIntersectionsComputed'](rayList);
        var deleteList = [];
        rayList.iterate(function (currentBucket) {
            var previousRay = currentBucket.prev.val;
            var currentRay = currentBucket.val;
            var nextRay = currentBucket.next.val;
            if (previousRay == nextRay) {
                if (observers['last2raysEncountered'])
                    observers['last2raysEncountered'](currentRay, nextRay);
                stop = true;
                return true;
            } else if (currentRay.aheadPoint && currentRay.behind >= currentRay.ahead && nextRay.ahead >= nextRay.behind) {
                var intersectionPoint = currentRay.aheadPoint;
                var coveredSites = getCoveredSites(currentRay).concat(getCoveredSites(nextRay));
                var sqRadius = currentRay.aheadPoint.r * currentRay.aheadPoint.r;
                for (i = 0; i < polygon.length; i++) {
                    var otherSqrDist = polygon[i].nextEdge.sqDistanceFromPoint(intersectionPoint);
                    if (coveredSites.indexOf(polygon[i].nextEdge) == -1 && otherSqrDist < sqRadius) {
                        if (observers['eliminatedRadius'])
                            observers['eliminatedRadius'](currentRay, nextRay, intersectionPoint, sqRadius, polygon[i].nextEdge, otherSqrDist);
                        return false;
                    }
                }
                var newRay = fuseRay(currentRay);
                if (observers['rayFused'])
                    observers['rayFused'](previousRay, nextRay, currentRay, intersectionPoint, sqRadius, newRay);
                deleteList.push([currentBucket, newRay]);
            }
            return false;
        });
        for (var i = 0; i < deleteList.length; i++) {
            hasMoved = true;
            var bucket = deleteList[i][0];
            bucket.val = deleteList[i][1];
            rayList.remove(bucket.next);
        }

        if (observers['stepFinished'])
            observers['stepFinished']();
        if (!hasMoved && !stop)
            throw new Error('skeleton has not moved');
        return rayList.isEmpty() || stop;
    }

    while (!run(rayList)) {
    }
}
