"use strict";

class KDtree {
    constructor(points) {
        this.tree = this.buildTree(points, true)
    }

    xComparison = (p1, p2) => p1.x - p2.x
    yComparison = (p1, p2) => p1.y - p2.y

    buildTree(points, useXAxis) {
        if (points.length === 0)
            return null;
        const sorted = [...points];
        sorted.sort(useXAxis ? this.xComparison : this.yComparison)
        let pivotIndex = Math.floor(sorted.length / 2);
        const point = sorted[pivotIndex]
        return {
            point,
            left: this.buildTree(sorted.slice(0, pivotIndex), !useXAxis),
            right: this.buildTree(sorted.slice(pivotIndex + 1, sorted.length), !useXAxis),
            axis: useXAxis ? 'x' : 'y'
        }
    }

    findMinimum(axis) {
        return this.findMinimumInTree(this.tree, axis)
    }

    findMinimumInTree(node, axis) {
        if (node.axis === axis) {
            return node.left ? this.findMinimumInTree(node.left, axis) : node.point;
        }
        let left = node.left ? this.findMinimumInTree(node.left, axis) : null
        let right = node.right ? this.findMinimumInTree(node.right, axis) : null
        const nodes = [left, right, node.point]
        nodes.sort((p1, p2) => {
            if (p1 == null)
                return 1
            if (p2 == null)
                return -1
            return p1[axis] - p2[axis]
        })
        return nodes[0]
    }

    findNearestNeighbor(point) {
        return this.findNNInTree(point, this.tree)
    }

    findNNInTree(point, node) {
        if (node == null)
            return null
        const closestChoice = (p1, p2) => {
            if (p1 == null)
                return p2
            if (p2 == null)
                return p1
            return sqSegLength([point, p1]) < sqSegLength([point, p2]) ? p1 : p2
        }
        const [pointValue, refValue] = [point[node.axis], node.point[node.axis]]
        const children = [node.left, node.right]
        if (pointValue >= refValue)
            children.reverse();
        let best = closestChoice(this.findNNInTree(point, children[0]), node.point)
        if (sqSegLength([point, best]) > (point[node.axis] - node.point[node.axis]) ** 2) {
            best = closestChoice(this.findNNInTree(point, children[1]), best)
        }
        return best
    }
}