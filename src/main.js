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

$shaderWriteBuffer = [0,0,0,0,0,40,0,0],
$shaderReadBuffer = new Uint8Array(8),

$vy =
$canJump =
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

$readFloat = $a => ($shaderReadBuffer[$a]/255 + $shaderReadBuffer[$a+1]/255/255)*2 - 1,

document.onkeydown = $a => $keys[$a.keyCode] = 1,
document.onkeyup = $a => $keys[$a.keyCode] = 0,

$main = $a => (
    $vy -= .02,
    $shaderWriteBuffer[5] += $vy,

    $keys[87] && ($shaderWriteBuffer[4] += .4*Math.sin($viewYaw), $shaderWriteBuffer[6] += .4*Math.cos($viewYaw)),
    $keys[83] && ($shaderWriteBuffer[4] -= .4*Math.sin($viewYaw), $shaderWriteBuffer[6] -= .4*Math.cos($viewYaw)),
    $keys[68] && ($shaderWriteBuffer[4] += .4*Math.cos($viewYaw), $shaderWriteBuffer[6] -= .4*Math.sin($viewYaw)),
    $keys[65] && ($shaderWriteBuffer[4] -= .4*Math.cos($viewYaw), $shaderWriteBuffer[6] += .4*Math.sin($viewYaw)),
    $keys[32] && $canJump && ($shaderWriteBuffer[5] += ($vy = .5), $canJump = 0),

    $shaderWriteBuffer[0] = $viewYaw,
    $shaderWriteBuffer[1] = $viewPitch,
    $shaderWriteBuffer[2] += 0.05,

    $shaderWriteBuffer[5] < $shaderWriteBuffer[2] + .2 && location.reload(),

    g.readPixels(
        g.drawArrays(
            g.TRIANGLES,
            g.uniform4fv(g.getUniformLocation($shader, 'g'), $shaderWriteBuffer), // Returns 0
            3
        ),
        0, 2, 1, g.RGBA, g.UNSIGNED_BYTE, $shaderReadBuffer
    ),

    $shaderWriteBuffer[4] += $readFloat(0),
    $shaderWriteBuffer[5] += $readFloat(2),
    $shaderWriteBuffer[6] += $readFloat(4),
    $shaderReadBuffer[6] && ( $vy = 0, $canJump = 1 ),

    requestAnimationFrame($main)
),
$main()