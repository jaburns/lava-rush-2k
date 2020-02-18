$shader = g.createProgram(),

$a = __shader('shader.vert'),
$b = g.createShader(g.VERTEX_SHADER),
g.shaderSource($b, $a),
g.compileShader($b),
g.attachShader($shader, $b),

$a = __shader('shader.frag'),
$b = g.createShader(g.FRAGMENT_SHADER),
g.shaderSource($b, $a),
g.compileShader($b),
g.attachShader($shader, $b),
console.log(g.getShaderInfoLog($b)),

g.vertexAttribPointer(
    g.linkProgram($shader),
    2,
    g.BYTE,
    g.enableVertexAttribArray(g.useProgram($shader)),
    g.bindBuffer($a = g.ARRAY_BUFFER, g.createBuffer()),
    g.bufferData($a, Uint8Array.of(1, 1, 1, 128, 128, 1), $a + 82) // ARRAY_BUFFER + 82 = STATIC_DRAW; 128 = -127
),

$shaderWriteBuffer = [0,0,0,0,0,0,0,0],
$shaderReadBuffer = new Uint8Array(16),

$py = 40,

$vy =
$canJump =
$px = $pz =
$viewYaw = $viewPitch = 0,
$keys = {},

a.onclick = $a => (
    a.requestPointerLock(),
    a.onclick = 0,
    a.onmousemove = $a => (
        $viewYaw += .003*$a.movementX,
        $viewPitch -= .003*$a.movementY
    )
),

document.onkeydown = $a => $keys[$a.keyCode] = 1,
document.onkeyup = $a => $keys[$a.keyCode] = 0,

$main = $a => (
    $vy -= .02,
    $py += $vy,

    $keys[87] && ($px += .4*Math.sin($viewYaw), $pz += .4*Math.cos($viewYaw)),
    $keys[83] && ($px -= .4*Math.sin($viewYaw), $pz -= .4*Math.cos($viewYaw)),
    $keys[68] && ($px += .4*Math.sin($viewYaw+Math.PI/2), $pz += .4*Math.cos($viewYaw+Math.PI/2)),
    $keys[65] && ($px += .4*Math.sin($viewYaw-Math.PI/2), $pz += .4*Math.cos($viewYaw-Math.PI/2)),
    $keys[32] && $canJump && ($py += ($vy = .5), $canJump = 0),

    $shaderWriteBuffer[0] = $viewYaw,
    $shaderWriteBuffer[1] = $viewPitch,
    $shaderWriteBuffer[4] = $px,
    $shaderWriteBuffer[5] = $py,
    $shaderWriteBuffer[6] = $pz,

    g.readPixels(
        g.drawArrays(
            g.TRIANGLES,
            g.uniform4fv(g.getUniformLocation($shader, 'g'), $shaderWriteBuffer), // Returns 0
            3
        ),
        0, 1, 1, g.RGBA, g.UNSIGNED_BYTE, $shaderReadBuffer
    ),

    $shaderReadBuffer[3] && (
        $py += $shaderReadBuffer[0]/255,
        $vy = 0,
        $canJump = 1
    ),

    requestAnimationFrame($main)
),
$main()