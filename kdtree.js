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
        return this.findMinimumNodeInTree(this.tree, axis).point
    }

    findMinimumNodeInTree(node, axis) {
        if (node.axis === axis) {
            return node.left ? this.findMinimumNodeInTree(node.left, axis) : node;
        }
        let left = node.left ? this.findMinimumNodeInTree(node.left, axis) : null
        let right = node.right ? this.findMinimumNodeInTree(node.right, axis) : null
        const nodes = [left, right, node]
        nodes.sort((p1, p2) => {
            if (p1 == null)
                return 1
            if (p2 == null)
                return -1
            return p1.point[axis] - p2.point[axis]
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

    deletePoint(point) {
        this.tree = this.deleteNode(point, this.tree)
    }

    deleteNode(point, node) {
        // https://www.cs.cmu.edu/~ckingsf/bioinfo-lectures/kdtrees.pdf
        if (node == null)
            throw new Error('oops, not found' + point)
        if (point === node.point) {
            if (node.right) {
                node.point = this.findMinimumNodeInTree(node.right, node.right.axis).point
                node.right = this.deleteNode(node.point, node.right)
                return node
            } else if (node.left) {
                // remove the minimum from the left tree, make what's remaining the new right
                // the minimum becomes the new self
                node.point = this.findMinimumNodeInTree(node.left, node.left.axis).point
                node.right = this.deleteNode(node.point, node.left)
                node.left = null
            } else
                // delete me, I was a leaf
                return null
        } else {
            if (point[node.axis] < node.point[node.axis])
                node.left = this.deleteNode(point, node.left)
            else
                node.right = this.deleteNode(point, node.right)
        }
        return node
    }
}