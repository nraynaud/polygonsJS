"use strict";
// source for the algorithm is here: http://maptools.home.comcast.net/~maptools/Skeleton.pdf
var medialAxis = (function () {
    var ID_COUNTER = 0;

    function getId() {
        ID_COUNTER++;
        return ID_COUNTER;
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

    function pointProjectsOnSegments(segments, point) {
        for (var j = 0; j < segments.length; j++)
            if (!pointProjectedOnSegment(point, segments[j]) || pointEquals(point, segments[j][0]) || pointEquals(point, segments[j][1]))
                return false;
        return true;
    }

    function reversedSegment(segment) {
        return [segment[1], segment[0]];
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
        firstSite.rays.push(this);
        this.secondSite = secondSite;
        secondSite.backRays.push(this);
        this.filterPointCandidate = candidateFilter ? candidateFilter : function () {
            return true;
        };
    }

    function ParabolicRay(vertexSite, edgeSite, origin, firstSite, secondSite) {
        this.origin = origin;
        this.vertex = vertexSite;
        this.edge = edgeSite;
        this.firstSite = firstSite;
        firstSite.rays.push(this);
        this.secondSite = secondSite;
        secondSite.backRays.push(this);
    }

    ParabolicRay.prototype = {
        filterPointCandidate: function (point) {
            return pointProjectsOnSegments([this.edge.segment], point);
        }
    };

    function LineSite(segment) {
        this.segment = segment;
        this.rays = [];
        this.backRays = [];
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
        coveredEdges: function () {
            return [this];
        }
    };

    function ReflexVertexSite(vertex, previousSite, nextSite) {
        this.vertex = vertex;
        this.previousSite = previousSite;
        this.nextSite = nextSite;
        this.rays = [];
        this.backRays = [];
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
            var ray1 = this.previousSite.igniteRayWithReflexVertexSite(this);
            var ray2 = this.igniteRayWithLineSite(this.nextSite, this.vertex);
            ray1.neverIntersects = ray2;
            ray2.neverIntersects = ray1;
            return [ray1, ray2];
        },
        coveredEdges: function () {
            return [this.previousSite, this.nextSite];
        }
    };

    function igniteVertexSegment(vertexSite, lineSite, origin, firstSite, secondSite) {
        var segment = lineSite.segment;
        if (segment[1] == vertexSite.vertex || segment[0] == vertexSite.vertex)
            return new LinearRay(vertexSite.vertex, perpendicularPoint(vertexSite.vertex, segment), firstSite, secondSite);
        return new ParabolicRay(vertexSite.vertex, lineSite, origin, firstSite, secondSite);
    }

    function createSkeleton(polygon, observers, afterProcess) {
        observers = observers ? observers : {};
        var area = signedArea(polygon);

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
            var newRay = ray.nextRay.secondSite.igniteRayWithPreviousSite(ray.firstSite, ray.aheadPoint);
            newRay.children = [ray, ray.nextRay];
            ray.parent = newRay;
            ray.nextRay.parent = newRay;
            ray.destination = ray.aheadPoint;
            ray.nextRay.destination = ray.aheadPoint;
            return  newRay;
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
                var eq = new solver.EquationSystemCreator();
                current.firstSite.dropEquation(eq);
                current.secondSite.dropEquation(eq);
                next.secondSite.dropEquation(eq);
                result = solver.solveEquations(eq, function (point) {
                    point.id = getId();
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


        function isReflexVertex(vertex, previousVertex, nextVertex, polygonArea) {
            return signedArea([previousVertex, vertex, nextVertex]) * polygonArea < 0;
        }

        var lineSites = [];

        function createInitialRays(polygon) {
            var rays = [];
            var reflexPoints = [];
            var sites = [];
            for (var i = 0; i < polygon.length; i++) {
                var previousPoint = polygon[(i + polygon.length - 1) % polygon.length];
                var vertex = polygon[i];
                if (!previousPoint.nextEdge)
                    previousPoint.nextEdge = new LineSite([previousPoint, vertex]);
                if (sites.length == 0)
                    sites.push(previousPoint.nextEdge)
                var nextPoint = polygon[(i + 1) % polygon.length];
                if (!vertex.nextEdge)
                    vertex.nextEdge = new LineSite([vertex, nextPoint]);
                previousPoint.nextEdge.nextSite = vertex.nextEdge;
                vertex.nextEdge.previousSite = previousPoint.nextEdge;
                lineSites.push(vertex.nextEdge);
                if (isReflexVertex(vertex, previousPoint, nextPoint, area)) {
                    vertex.reflex = true;
                    reflexPoints.push(vertex);
                    var reflexVertexSite = new ReflexVertexSite(vertex, previousPoint.nextEdge, vertex.nextEdge);
                    reflexVertexSite.previousSite.nextSite = reflexVertexSite;
                    reflexVertexSite.nextSite.previousSite = reflexVertexSite;
                    Array.prototype.push.apply(rays, reflexVertexSite.ignitePerpendicularRays());
                    sites.push(reflexVertexSite);
                } else {
                    var ray = previousPoint.nextEdge.igniteRayWithLineSite(vertex.nextEdge, vertex, vertex);
                    rays.push(ray);
                    ray.medialRay = {type: 'limb', vertex: vertex, edge1: previousPoint.nextEdge, edge2: vertex.nextEdge,
                        origin: vertex, children: []};
                }
                sites.push(vertex.nextEdge);
            }
            if (observers['initialized'])
                observers['initialized'](rays, reflexPoints);
            return {rays: rays, sites: sites};
        }

        var initialRays = createInitialRays(polygon);
        var rayList = createLinkedList(initialRays.rays);
        var siteList = createLinkedList(initialRays.sites);
        var root;

        function isBestIntersection(currentRay, nextRay, lineSites, intersectionPoint, sqRadius) {
            var coveredSites = getCoveredSites(currentRay).concat(getCoveredSites(nextRay));
            for (var i = 0; i < lineSites.length; i++) {
                var otherSqrDist = lineSites[i].sqDistanceFromPoint(intersectionPoint);
                if (otherSqrDist < sqRadius && coveredSites.indexOf(lineSites[i]) == -1) {
                    if (observers['eliminatedRadius'])
                        observers['eliminatedRadius'](currentRay, nextRay, intersectionPoint, sqRadius, lineSites[i], otherSqrDist);
                    return false;
                }
            }
            return true;
        }

        function run(rayList, lineSites) {
            var stop = false;
            var hasMoved = false;
            rayList.iterate(function (currentBucket) {
                intersectNextRay(currentBucket.val, currentBucket.next.val);
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
                    root = {type: 'root', children: [
                        {type: 'spine', origin: previousRay.origin, children: [previousRay.medialRay], internalRay: previousRay},
                        currentRay.medialRay
                    ], origin: currentRay.origin};
                    currentRay.destination = previousRay.origin;
                    previousRay.destination = currentRay.origin;
                    stop = true;
                    return true;
                } else if (currentRay.aheadPoint && currentRay.behind >= currentRay.ahead && nextRay.ahead >= nextRay.behind) {
                    var intersectionPoint = currentRay.aheadPoint;
                    var sqRadius = currentRay.aheadPoint.r * currentRay.aheadPoint.r;
                    if (!isBestIntersection(currentRay, nextRay, lineSites, intersectionPoint, sqRadius))
                        return false;
                    var newRay = fuseRay(currentRay);
                    newRay.medialRay = {type: 'spine', children: [currentRay.medialRay, nextRay.medialRay], internalRay: newRay, origin: newRay.origin};
                    if (observers['rayFused'])
                        observers['rayFused'](previousRay, nextRay, currentRay, intersectionPoint, sqRadius, newRay);
                    deleteList.push([currentBucket, newRay]);
                }
                return false;
            });

            var rootMedialRays = [];
            var rootOrigin;
            for (var i = 0; i < deleteList.length; i++) {
                hasMoved = true;
                var bucket = deleteList[i][0];
                rootMedialRays.push(bucket.val.medialRay);
                rootOrigin = bucket.val.aheadPoint;
                bucket.val = deleteList[i][1];
                rayList.remove(bucket.next);
            }

            if (rayList.isEmpty())
                root = {type: 'root', children: rootMedialRays, origin: rootOrigin};

            if (observers['stepFinished'])
                observers['stepFinished']();
            if (!hasMoved && !stop)
                throw new Error('skeleton has not moved');
            return rayList.isEmpty() || stop;
        }

        while (!run(rayList, lineSites)) {
        }
        if (observers['afterProcess'])
            observers['afterProcess'](root, polygon, createLinkedList, run, siteList);
        return root;
    }

    return {
        createSkeleton: createSkeleton,
        LinearRay: LinearRay,
        ParabolicRay: ParabolicRay,
        LineSite: LineSite,
        ReflexVertexSite: ReflexVertexSite
    }
})();
