function vAdd (any_number_of_vectors) {

	var result = [0, 0];

	for (var i = 0; i < arguments.length; i++) {

		result[0] += arguments[i][0];
		result[1] += arguments[i][1];
	}

	return result;
}

function vSub (a, b) {

	return [a[0] - b[0], a[1] - b[1]];
}

function vsMul (v, s) {

	return [v[0] * s, v[1] * s];
}

function coordBarycentricToCartesian (triangle, b) {

	return vAdd(
		vsMul(triangle[0], b[0]),
		vsMul(triangle[1], b[1]),
		vsMul(triangle[2], b[2])
	);
}

function pathBarycentricToCartesian (triangle, path) {

	return path.map(function (bezier) {

		return bezier.map(function (b) {

			return coordBarycentricToCartesian(triangle, b);
		});
	});
}

function flatten (arrayOfArrays) {

	return arrayOfArrays.reduce(function (soFar, current) {

		return soFar.concat(current);

	}, []);
}

function mirrorBarycentric (b) {

	return [b[0], b[2], b[1]];
}

function splitBezierTriangle (bezierTriangle) {

	var centerLine = [
		// Bottom midpoint.
		evaluateBezierTriangle(bezierTriangle, [ 0/2,   1/2,   1/2]),
		// Progressively closer to the top corner.
		// Just arbitrary interpolated values picked because they look ok. (Just using 1/3 and 2/3 looks bad.)
		// There's probably a correct mathy way to find the exact spots.
		evaluateBezierTriangle(bezierTriangle, [18/64, 23/64, 23/64]),
		evaluateBezierTriangle(bezierTriangle, [ 3/5,   1/5,   1/5]),
	];

	var barycentricCoordsOfRightHalfBottom = [
		[0/6, 6/6, 0/6],
		[0/6, 5/6, 1/6],
		[0/6, 4/6, 2/6]
	];

	//    0
	//   8 1
	//  7   2
	// 6 5 4 3

	return {
		left : [].concat(
			[0, 8, 7]
				.map(function(i){ return bezierTriangle[i];}),
			barycentricCoordsOfRightHalfBottom
				// Left side winds the opposite way to get the curve on the right side.
				.map(mirrorBarycentric)
				.map(function (b) {
					return evaluateBezierTriangle(bezierTriangle, b);
				}),
			centerLine
		),
		right: [].concat(
			[0, 1, 2]
				.map(function(i){ return bezierTriangle[i];}),
			barycentricCoordsOfRightHalfBottom
				.map(function (b) {
					return evaluateBezierTriangle(bezierTriangle, b);
				}),
			centerLine
		)
	};
}


function mirrorPath (path) {

	return path.map(function (segment) {

		return segment.map(mirrorBarycentric);
	});
};

function drawSierpinskiHeart (
	ctx,
	lineWidth,
	baseTriangleCartesian,
	heartInRightHalfBarycentricBezier,
	heartRightUpper,
	heartRightLower,

	bezierTriangle,
	depth
) {

	// Split the heart in left/right halves and draw both.

	var halves = splitBezierTriangle(bezierTriangle);

	drawHalfSierpinskiHeart(
		ctx,
		lineWidth,
		baseTriangleCartesian,
		heartInRightHalfBarycentricBezier,
		heartRightUpper,
		heartRightLower,

		halves.left,
		depth
	);
	drawHalfSierpinskiHeart(
		ctx,
		lineWidth,
		baseTriangleCartesian,
		heartInRightHalfBarycentricBezier,
		heartRightUpper,
		heartRightLower,

		halves.right,
		depth
	);
}

function drawHalfSierpinskiHeart (
	ctx,
	lineWidth,
	baseTriangleCartesian,
	heartInRightHalfBarycentricBezier,
	heartRightUpper,
	heartRightLower,

	halfBezierTriangle,
	depth
) {

	drawPath(
		ctx,
		lineWidth,
		baseTriangleCartesian,
		transformPathByBezierTriangle(
			halfBezierTriangle,
			heartInRightHalfBarycentricBezier
		)
	);

	if (depth > 1) {

		var heartRightUpperForHalf = heartRightUpper.map(makeRightHalf);
		var topHalfTriangle = [
			[1, 0, 0],
			interpolateBarycentric([1, 0, 0], heartRightUpperForHalf[3], 2/3),
			interpolateBarycentric([1, 0, 0], heartRightUpperForHalf[3], 1/3),
			heartRightUpperForHalf[3],
			heartRightUpperForHalf[2],
			heartRightUpperForHalf[1],
			heartRightUpperForHalf[0],
			interpolateBarycentric([1, 0, 0], heartRightUpperForHalf[0], 2/3),
			interpolateBarycentric([1, 0, 0], heartRightUpperForHalf[0], 1/3)
		];
		drawHalfSierpinskiHeart(
			ctx,
			lineWidth,
			baseTriangleCartesian,
			heartInRightHalfBarycentricBezier,
			heartRightUpper,
			heartRightLower,

			transformBezierTriangleByBezierTriangle(halfBezierTriangle, topHalfTriangle),
			depth - 1
		);


		var heartRightLowerForHalf = heartRightLower.map(makeRightHalf);
		var lowerFullTriangle = [
			heartRightLowerForHalf[0],
			interpolateBarycentric([0, 1, 0], heartRightLowerForHalf[0], 2/3),
			interpolateBarycentric([0, 1, 0], heartRightLowerForHalf[0], 1/3),
			[0, 1, 0],
			interpolateBarycentric([0, 1, 0], heartRightLowerForHalf[3], 1/3),
			interpolateBarycentric([0, 1, 0], heartRightLowerForHalf[3], 2/3),
			heartRightLowerForHalf[3],
			heartRightLowerForHalf[2],
			heartRightLowerForHalf[1]
		];
		drawSierpinskiHeart(
			ctx,
			lineWidth,
			baseTriangleCartesian,
			heartInRightHalfBarycentricBezier,
			heartRightUpper,
			heartRightLower,

			transformBezierTriangleByBezierTriangle(halfBezierTriangle, lowerFullTriangle),
			depth - 1
		);
	}
}




function drawPath (ctx, lineWidth, baseTriangleCartesian, path, depth) {

	ctx.strokeStyle = "red";
	ctx.beginPath();
	ctx.lineWidth = lineWidth;
	pathBarycentricToCartesian(baseTriangleCartesian, path).forEach(function (bezier) {

		ctx.moveTo.apply(ctx, bezier[0]);
		ctx.bezierCurveTo.apply(ctx, flatten(bezier.slice(1)));
	});
	ctx.stroke();
}

function transformPathByBezierTriangle (bezierTriangle, path) {

	return path.map(function (bezier) {

		return bezier.map(function (b) {

			return evaluateBezierTriangle(bezierTriangle, b);
		});
	});
}

function transformBezierTriangleByBezierTriangle (transformer, transformee) {

	// return transformee.map(barycentricTriangleEvaluator())


// TODO: Just using the resulting bezier patch coord for the tangents is plain wrong.
	return transformee.map(function (b) {

		return evaluateBezierTriangle(transformer, b);
	});
}

function bezierTriangleByBezierTriangleTransformer (transformer) {

	return function (transformee) {

		return transformBezierTriangleByBezierTriangle (transformer, transformee);
	}
}

function evaluateBezierTriangle (bezierTriangle, b) {

	var subTriangles = makeSubTriangles(bezierTriangle);

	return evaluateBarycentricTriangle([
		evaluateBarycentricTriangle([
			evaluateBarycentricTriangle(subTriangles[0], b),
			evaluateBarycentricTriangle(subTriangles[1], b),
			evaluateBarycentricTriangle(subTriangles[5], b)
		], b),
		evaluateBarycentricTriangle([
			evaluateBarycentricTriangle(subTriangles[1], b),
			evaluateBarycentricTriangle(subTriangles[2], b),
			evaluateBarycentricTriangle(subTriangles[3], b)
		], b),
		evaluateBarycentricTriangle([
			evaluateBarycentricTriangle(subTriangles[5], b),
			evaluateBarycentricTriangle(subTriangles[3], b),
			evaluateBarycentricTriangle(subTriangles[4], b)
		], b)
	], b);
}

function makeSubTriangles (bezierTriangle) {

	var center = bAvg(
		bezierTriangle[1],
		bezierTriangle[2],
		bezierTriangle[4],
		bezierTriangle[5],
		bezierTriangle[7],
		bezierTriangle[8]
	);

	return [
		[bezierTriangle[0], bezierTriangle[1], bezierTriangle[8]],
		[bezierTriangle[1], bezierTriangle[2], center     ],
		[bezierTriangle[2], bezierTriangle[3], bezierTriangle[4]],
		[center     , bezierTriangle[4], bezierTriangle[5]],
		[bezierTriangle[7], bezierTriangle[5], bezierTriangle[6]],
		[bezierTriangle[8], center     , bezierTriangle[7]]
	];
}

function bAvg (any_number_of_coords) {

	var result = [0, 0, 0];

	for (var i = 0; i < arguments.length; i++) {

		result[0] += arguments[i][0];
		result[1] += arguments[i][1];
		result[2] += arguments[i][2];
	};

	result[0] /= arguments.length;
	result[1] /= arguments.length;
	result[2] /= arguments.length;

	return result;
}

function evaluateBarycentricTriangle (triangle, b) {

	return [
		triangle[0][0] * b[0] +
		triangle[1][0] * b[1] +
		triangle[2][0] * b[2],
		triangle[0][1] * b[0] +
		triangle[1][1] * b[1] +
		triangle[2][1] * b[2],
		triangle[0][2] * b[0] +
		triangle[1][2] * b[1] +
		triangle[2][2] * b[2]
	];
}

function barycentricTriangleEvaluator (triangle) {

	return function (b) {

		return evaluateBarycentricTriangle(triangle, b);
	}
}

function makeRightHalf (b) {

	return [b[0], b[1] - b[2], b[2] * 2];
}

function unmakeRightHalf (b) {

	var newB2 = b[2] / 2;

	return [b[0], b[1] + newB2, newB2];
}

function interpolateBarycentric (a, b, factor) {

	return [
		a[0]*(1-factor) + b[0]*factor,
		a[1]*(1-factor) + b[1]*factor,
		a[2]*(1-factor) + b[2]*factor
	];
}


(function main () {


	var canvas = document.getElementById('canvas');
	var ctx = canvas.getContext('2d');

	var pixelDensity = window.devicePixelRatio;
	var lineWidth = 2 * pixelDensity;
	var canvasSize = [
		canvas.clientWidth  * pixelDensity,
		canvas.clientHeight * pixelDensity
	];
	canvas.setAttribute('width',  canvasSize[0]);
	canvas.setAttribute('height', canvasSize[1]);


	var triangleHeightFactor = Math.sqrt(.75);
	var triangleSize = [
		Math.min(canvasSize[0], canvasSize[1] / triangleHeightFactor) - 2 * lineWidth,
		Math.min(canvasSize[1], canvasSize[0] * triangleHeightFactor) - 2 * lineWidth
	];
	var margin = vsMul(vSub(canvasSize, triangleSize), 1/2);
	var baseTriangleCartesian = [
		vAdd(margin, [triangleSize[0]/2, 0              ]),
		vAdd(margin, [triangleSize[0]  , triangleSize[1]]),
		vAdd(margin, [0                , triangleSize[1]])
	];


	var heartRightUpper = [
		[
			1/2,
			1/4,
			1/4
		],
		[
			13/20,
			5/20,
			2/20
		],
		[
			6/10,
			4/10,
			0
		],
		[
			1/2,
			1/2,
			0
		],
	];

	var heartRightLower = [
		[
			1/2,
			1/2,
			0
		],
		[
			4/10,
			6/10,
			0
		],
		[
			3/16,
			10/16,
			3/16
		],
		[
			0,
			1/2,
			1/2
		]
	];


	var heartBarycentricBezier = [
		heartRightUpper,
		heartRightLower,
		heartRightLower.map(mirrorBarycentric),
		heartRightUpper.map(mirrorBarycentric)
	];


	var heartInRightHalfBarycentricBezier = [
		heartRightUpper.map(makeRightHalf),
		heartRightLower.map(makeRightHalf)
	];

	var heartInLeftHalfBarycentricBezier = mirrorPath(heartInRightHalfBarycentricBezier);





	var baseBezierTriangle = [
		[1, 0, 0],
		[2/3, 1/3 , 0],
		[1/3, 2/3 , 0],
		[0, 1 , 0],
		[0, 2/3 , 1/3],
		[0, 1/3 , 2/3],
		[0, 0 , 1],
		[1/3, 0 , 2/3],
		[2/3, 0 , 1/3]
	];

	drawSierpinskiHeart(
		ctx,
		lineWidth,
		baseTriangleCartesian,
		heartInRightHalfBarycentricBezier,
		heartRightUpper,
		heartRightLower,

		baseBezierTriangle,
		7
	);


})();