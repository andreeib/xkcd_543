interface BarycentricCoord {
	a: number;
	b: number;
	c: number;
}
interface CartesianCoord {
	x: number;
	y: number;
}
interface Triangle<TCoord> {
	a: TCoord;
	b: TCoord;
	c: TCoord;
}
type BarycentricTriangle = Triangle<BarycentricCoord>;
type CartesianTriangle = Triangle<CartesianCoord>;
interface BezierTriangle {
	a: BarycentricCoord;
	b: BarycentricCoord;
	c: BarycentricCoord;
	d: BarycentricCoord;
	e: BarycentricCoord;
	f: BarycentricCoord;
	g: BarycentricCoord;
	h: BarycentricCoord;
	i: BarycentricCoord;
}
interface BezierCurve {
	a: BarycentricCoord;
	b: BarycentricCoord;
	c: BarycentricCoord;
	d: BarycentricCoord;
}
type Path = Array<BezierCurve>;
type TesselatedPath = Array<BarycentricCoord>;

function vAdd(...vectors: Array<CartesianCoord>): CartesianCoord {
	var result = { x: 0, y: 0 };

	for (var i = 0; i < vectors.length; i++) {
		result.x += vectors[i].x;
		result.y += vectors[i].y;
	}

	return result;
}

function vSub(a: CartesianCoord, b: CartesianCoord): CartesianCoord {
	return { x: a.x - b.x, y: a.y - b.y };
}

function vsMul(v: CartesianCoord, s: number): CartesianCoord {
	return { x: v.x * s, y: v.y * s };
}

function coordBarycentricToCartesian(
	triangle: CartesianTriangle,
	coord: BarycentricCoord,
): CartesianCoord {
	return vAdd(
		vsMul(triangle.a, coord.a),
		vsMul(triangle.b, coord.b),
		vsMul(triangle.c, coord.c),
	);
}

function mirrorBarycentric(coord: BarycentricCoord): BarycentricCoord {
	return { a: coord.a, b: coord.c, c: coord.b };
}

function splitBezierTriangle(
	bezierTriangle: BezierTriangle,
): { left: BezierTriangle; right: BezierTriangle } {
	var centerLine = [
		// Bottom midpoint.
		evaluateBezierTriangle(bezierTriangle, { a: 0 / 2, b: 1 / 2, c: 1 / 2 }),
		// Progressively closer to the top corner.
		// Just arbitrary interpolated values picked because they look ok. (Just using 1/3 and 2/3 looks bad.)
		// There's probably a correct mathy way to find the exact spots.
		evaluateBezierTriangle(bezierTriangle, {
			a: 18 / 64,
			b: 23 / 64,
			c: 23 / 64,
		}),
		evaluateBezierTriangle(bezierTriangle, { a: 3 / 5, b: 1 / 5, c: 1 / 5 }),
	];

	var barycentricCoordsOfRightHalfBottom = [
		{ a: 0 / 6, b: 6 / 6, c: 0 / 6 },
		{ a: 0 / 6, b: 5 / 6, c: 1 / 6 },
		{ a: 0 / 6, b: 4 / 6, c: 2 / 6 },
	];

	const bottomLeftHalf = barycentricCoordsOfRightHalfBottom
		// Left side winds the opposite way to get the curve on the right side.
		.map(mirrorBarycentric)
		.map(function(b) {
			return evaluateBezierTriangle(bezierTriangle, b);
		});

	const bottomRightHalf = barycentricCoordsOfRightHalfBottom.map(function(b) {
		return evaluateBezierTriangle(bezierTriangle, b);
	});

	//    a
	//   i b
	//  h   c
	// g f e d

	return {
		left: {
			a: bezierTriangle.a,
			b: bezierTriangle.i,
			c: bezierTriangle.h,
			d: bottomLeftHalf[0],
			e: bottomLeftHalf[1],
			f: bottomLeftHalf[2],
			g: centerLine[0],
			h: centerLine[1],
			i: centerLine[2],
		},
		right: {
			a: bezierTriangle.a,
			b: bezierTriangle.b,
			c: bezierTriangle.c,
			d: bottomRightHalf[0],
			e: bottomRightHalf[1],
			f: bottomRightHalf[2],
			g: centerLine[0],
			h: centerLine[1],
			i: centerLine[2],
		},
	};
}

function tesselateSierpinskiHeart(
	baseTriangleCartesian: CartesianTriangle,
	heartInRightHalfBarycentricBezier: Path,
	heartRightUpper: BezierCurve,
	heartRightLower: BezierCurve,
	bezierTriangle: BezierTriangle,
	depth: number,
): Array<TesselatedPath> {
	// Split the heart in left/right halves and draw both.

	var halves = splitBezierTriangle(bezierTriangle);

	return [
		...tesselateHalfSierpinskiHeart(
			baseTriangleCartesian,
			heartInRightHalfBarycentricBezier,
			heartRightUpper,
			heartRightLower,

			halves.left,
			depth,
		),
		...tesselateHalfSierpinskiHeart(
			baseTriangleCartesian,
			heartInRightHalfBarycentricBezier,
			heartRightUpper,
			heartRightLower,

			halves.right,
			depth,
		),
	];
}

function tesselateHalfSierpinskiHeart(
	baseTriangleCartesian: CartesianTriangle,
	heartInRightHalfBarycentricBezier: Path,
	heartRightUpper: BezierCurve,
	heartRightLower: BezierCurve,
	halfBezierTriangle: BezierTriangle,
	depth: number,
): Array<TesselatedPath> {
	let tesselated = [
		tesselatePath(
			heartInRightHalfBarycentricBezier,
			Math.max(1, Math.ceil(depth * 2)),
		),
	];

	if (depth > 1) {
		var heartRightUpperForHalf = makeRightHalfBezierCurve(heartRightUpper);
		const fullA = { a: 1, b: 0, c: 0 };
		var topHalfTriangle = {
			a: fullA,
			b: interpolateBarycentric(fullA, heartRightUpperForHalf.d, 2 / 3),
			c: interpolateBarycentric(fullA, heartRightUpperForHalf.d, 1 / 3),
			d: heartRightUpperForHalf.d,
			e: heartRightUpperForHalf.c,
			f: heartRightUpperForHalf.b,
			g: heartRightUpperForHalf.a,
			h: interpolateBarycentric(fullA, heartRightUpperForHalf.a, 2 / 3),
			i: interpolateBarycentric(fullA, heartRightUpperForHalf.a, 1 / 3),
		};

		var heartRightLowerForHalf = makeRightHalfBezierCurve(heartRightLower);
		const fullB = { a: 0, b: 1, c: 0 };
		var lowerFullTriangle = {
			a: heartRightLowerForHalf.a,
			b: interpolateBarycentric(fullB, heartRightLowerForHalf.a, 2 / 3),
			c: interpolateBarycentric(fullB, heartRightLowerForHalf.a, 1 / 3),
			d: fullB,
			e: interpolateBarycentric(fullB, heartRightLowerForHalf.d, 1 / 3),
			f: interpolateBarycentric(fullB, heartRightLowerForHalf.d, 2 / 3),
			g: heartRightLowerForHalf.d,
			h: heartRightLowerForHalf.c,
			i: heartRightLowerForHalf.b,
		};

		tesselated = [
			...tesselated,
			...tesselateHalfSierpinskiHeart(
				baseTriangleCartesian,
				heartInRightHalfBarycentricBezier,
				heartRightUpper,
				heartRightLower,

				topHalfTriangle,
				depth - 1,
			),
			...tesselateSierpinskiHeart(
				baseTriangleCartesian,
				heartInRightHalfBarycentricBezier,
				heartRightUpper,
				heartRightLower,

				lowerFullTriangle,
				depth - 1,
			),
		];
	}

	return tesselated.map(tesselatedPath =>
		tesselatedPath.map(coord =>
			evaluateBezierTriangle(halfBezierTriangle, coord),
		),
	);
}

function evaluateBezierCurve(
	bezierCurve: BezierCurve,
	interpolationFactor: number,
) {
	const a = interpolateBarycentric(
		bezierCurve.a,
		bezierCurve.b,
		interpolationFactor,
	);
	const b = interpolateBarycentric(
		bezierCurve.b,
		bezierCurve.c,
		interpolationFactor,
	);
	const c = interpolateBarycentric(
		bezierCurve.c,
		bezierCurve.d,
		interpolationFactor,
	);

	const d = interpolateBarycentric(a, b, interpolationFactor);
	const e = interpolateBarycentric(b, c, interpolationFactor);

	return interpolateBarycentric(d, e, interpolationFactor);
}

function tesselatePath(path: Path, numSegments: number): TesselatedPath {
	const coords = [];
	// let coords = [] as Array<Coord>;
	for (const curve of path) {
		for (let i = 0; i <= numSegments; ++i) {
			coords.push(evaluateBezierCurve(curve, i / numSegments));
		}
	}
	// for (const curve of path) {
	// 	coords = [...coords, ...curve];
	// }

	return coords;
}

function evaluateBezierTriangle(
	bezierTriangle: BezierTriangle,
	coord: BarycentricCoord,
): BarycentricCoord {
	var subTriangles = makeSubTriangles(bezierTriangle);

	return evaluateBarycentricTriangle(
		{
			a: evaluateBarycentricTriangle(
				{
					a: evaluateBarycentricTriangle(subTriangles[0], coord),
					b: evaluateBarycentricTriangle(subTriangles[1], coord),
					c: evaluateBarycentricTriangle(subTriangles[5], coord),
				},
				coord,
			),
			b: evaluateBarycentricTriangle(
				{
					a: evaluateBarycentricTriangle(subTriangles[1], coord),
					b: evaluateBarycentricTriangle(subTriangles[2], coord),
					c: evaluateBarycentricTriangle(subTriangles[3], coord),
				},
				coord,
			),
			c: evaluateBarycentricTriangle(
				{
					a: evaluateBarycentricTriangle(subTriangles[5], coord),
					b: evaluateBarycentricTriangle(subTriangles[3], coord),
					c: evaluateBarycentricTriangle(subTriangles[4], coord),
				},
				coord,
			),
		},
		coord,
	);
}

function makeSubTriangles(
	bezierTriangle: BezierTriangle,
): Array<BarycentricTriangle> {
	var center = bAvg(
		bezierTriangle.b,
		bezierTriangle.c,
		bezierTriangle.e,
		bezierTriangle.f,
		bezierTriangle.h,
		bezierTriangle.i,
	);

	return [
		{ a: bezierTriangle.a, b: bezierTriangle.b, c: bezierTriangle.i },
		{ a: bezierTriangle.b, b: bezierTriangle.c, c: center },
		{ a: bezierTriangle.c, b: bezierTriangle.d, c: bezierTriangle.e },
		{ a: center, b: bezierTriangle.e, c: bezierTriangle.f },
		{ a: bezierTriangle.h, b: bezierTriangle.f, c: bezierTriangle.g },
		{ a: bezierTriangle.i, b: center, c: bezierTriangle.h },
	];
}

function bAvg(...coords: Array<BarycentricCoord>): BarycentricCoord {
	var result = { a: 0, b: 0, c: 0 };

	for (var i = 0; i < coords.length; i++) {
		result.a += coords[i].a;
		result.b += coords[i].b;
		result.c += coords[i].c;
	}

	result.a /= coords.length;
	result.b /= coords.length;
	result.c /= coords.length;

	return result;
}

function evaluateBarycentricTriangle(
	triangle: BarycentricTriangle,
	coord: BarycentricCoord,
): BarycentricCoord {
	return {
		a: triangle.a.a * coord.a + triangle.b.a * coord.b + triangle.c.a * coord.c,
		b: triangle.a.b * coord.a + triangle.b.b * coord.b + triangle.c.b * coord.c,
		c: triangle.a.c * coord.a + triangle.b.c * coord.b + triangle.c.c * coord.c,
	};
}

function makeRightHalf(coord: BarycentricCoord): BarycentricCoord {
	return { a: coord.a, b: coord.b - coord.c, c: coord.c * 2 };
}

function makeRightHalfBezierCurve(curve: BezierCurve): BezierCurve {
	return {
		a: makeRightHalf(curve.a),
		b: makeRightHalf(curve.b),
		c: makeRightHalf(curve.c),
		d: makeRightHalf(curve.d),
	};
}

function interpolateBarycentric(
	coordA: BarycentricCoord,
	coordB: BarycentricCoord,
	factor: number,
): BarycentricCoord {
	return {
		a: coordA.a * (1 - factor) + coordB.a * factor,
		b: coordA.b * (1 - factor) + coordB.b * factor,
		c: coordA.c * (1 - factor) + coordB.c * factor,
	};
}

(function main() {
	var canvas = document.getElementById("canvas") as HTMLCanvasElement;
	var ctx = canvas.getContext("2d")!;

	var pixelDensity = window.devicePixelRatio;
	var lineWidth = 2 * pixelDensity;
	var canvasSize = {
		x: canvas.clientWidth * pixelDensity,
		y: canvas.clientHeight * pixelDensity,
	};
	canvas.setAttribute("width", canvasSize.x + "px");
	canvas.setAttribute("height", canvasSize.y + "px");

	var triangleHeightFactor = Math.sqrt(0.75);
	var triangleSize = {
		x:
			Math.min(canvasSize.x, canvasSize.y / triangleHeightFactor) -
			2 * lineWidth,
		y:
			Math.min(canvasSize.y, canvasSize.x * triangleHeightFactor) -
			2 * lineWidth,
	};
	var margin = vsMul(vSub(canvasSize, triangleSize), 1 / 2);
	var baseTriangleCartesian = {
		a: vAdd(margin, { x: triangleSize.x / 2, y: 0 }),
		b: vAdd(margin, { x: triangleSize.x, y: triangleSize.y }),
		c: vAdd(margin, { x: 0, y: triangleSize.y }),
	};

	var heartRightUpper = {
		a: { a: 1 / 2, b: 1 / 4, c: 1 / 4 },
		b: { a: 13 / 20, b: 5 / 20, c: 2 / 20 },
		c: { a: 6 / 10, b: 4 / 10, c: 0 },
		d: { a: 1 / 2, b: 1 / 2, c: 0 },
	};

	var heartRightLower = {
		a: { a: 1 / 2, b: 1 / 2, c: 0 },
		b: { a: 4 / 10, b: 6 / 10, c: 0 },
		c: { a: 3 / 16, b: 10 / 16, c: 3 / 16 },
		d: { a: 0, b: 1 / 2, c: 1 / 2 },
	};

	// var heartBarycentricBezier = [
	// 	heartRightUpper,
	// 	heartRightLower,
	// 	heartRightLower.map(mirrorBarycentric),
	// 	heartRightUpper.map(mirrorBarycentric),
	// ];

	var heartInRightHalfBarycentricBezier = [
		makeRightHalfBezierCurve(heartRightUpper),
		makeRightHalfBezierCurve(heartRightLower),
	];

	// var heartInLeftHalfBarycentricBezier = mirrorPath(
	// 	heartInRightHalfBarycentricBezier,
	// );

	var baseBezierTriangle = {
		a: { a: 1, b: 0, c: 0 },
		b: { a: 2 / 3, b: 1 / 3, c: 0 },
		c: { a: 1 / 3, b: 2 / 3, c: 0 },
		d: { a: 0, b: 1, c: 0 },
		e: { a: 0, b: 2 / 3, c: 1 / 3 },
		f: { a: 0, b: 1 / 3, c: 2 / 3 },
		g: { a: 0, b: 0, c: 1 },
		h: { a: 1 / 3, b: 0, c: 2 / 3 },
		i: { a: 2 / 3, b: 0, c: 1 / 3 },
	};

	const tesselated = tesselateSierpinskiHeart(
		baseTriangleCartesian,
		heartInRightHalfBarycentricBezier,
		heartRightUpper,
		heartRightLower,

		baseBezierTriangle,
		7,
	);

	ctx.strokeStyle = "red";
	ctx.lineWidth = lineWidth;
	for (const path of tesselated) {
		ctx.beginPath();
		const coord = coordBarycentricToCartesian(baseTriangleCartesian, path[0]);
		ctx.moveTo(coord.x, coord.y);
		for (const barycentricCoord of path.slice(1)) {
			const coord = coordBarycentricToCartesian(
				baseTriangleCartesian,
				barycentricCoord,
			);
			ctx.lineTo(coord.x, coord.y);
		}
		ctx.stroke();
	}
})();