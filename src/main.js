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

$init = $a => (
    $shaderWriteBuffer = [0,0,0,0,0,40,0,0],
    $shaderReadBuffer = new Uint8Array(8),
    $deadFrames = -30,
    $vx =
    $vy =
    $vz =
    $vx1 =
    $vz1 =
    $canJump =
    $viewYaw = $viewPitch = 0,
    $keys = {}
),

$sensitivity = .003,

a.onclick = $a => (
    a.requestPointerLock(),
    a.onclick = 0,
    a.onmousemove = $a => $deadFrames == 0 && (
        $viewYaw += $sensitivity*$a.movementX,
        $viewPitch -= $sensitivity*$a.movementY
    )
),

$readFloat = $a => ($shaderReadBuffer[$a]/255 + $shaderReadBuffer[$a+1]/255/255)*2 - 1,

$setMousesensitivity = $a => $a > 48 && $a < 58 && ($sensitivity = .0005*($a-48)),

document.onkeydown = $a => ($keys[$a.keyCode] = 1, $setMousesensitivity($a.keyCode),1),
document.onkeyup = $a => $keys[$a.keyCode] = 0,

$main = $a => (
    $deadFrames > 180 && $init(),
    $deadFrames == -31 && $init(),

    $vy -= .02,
    $shaderWriteBuffer[5] += $vy,

    $vx = $vz = 0,

    $deadFrames > -31 && (

        $keys[87] && ($vx += Math.sin($viewYaw), $vz += Math.cos($viewYaw)),
        $keys[83] && ($vx -= Math.sin($viewYaw), $vz -= Math.cos($viewYaw)),
        $keys[68] && ($vx += Math.cos($viewYaw), $vz -= Math.sin($viewYaw)),
        $keys[65] && ($vx -= Math.cos($viewYaw), $vz += Math.sin($viewYaw)),
        $keys[32] && $canJump && ($shaderWriteBuffer[5] += ($vy = .5), $canJump = 0),

        $vx && $vz && (
            $vx /= Math.sqrt($vz*$vz + $vx*$vx),
            $vz /= Math.sqrt($vz*$vz + $vx*$vx))

    ),

    $vx1 += ($vx - $vx1)/5,
    $vz1 += ($vz - $vz1)/5,

    $shaderWriteBuffer[4] += .4*$vx1,
    $shaderWriteBuffer[6] += .4*$vz1,
    $shaderWriteBuffer[0] = $viewYaw,
    $shaderWriteBuffer[1] = $viewPitch,
    $shaderWriteBuffer[2] += 0.05,

    $shaderWriteBuffer[5] < $shaderWriteBuffer[2] + 1
        && $deadFrames++
        || (s.innerText = $shaderWriteBuffer[5]|0),

    $deadFrames < 0 && $deadFrames++,

    $shaderWriteBuffer[3] = $deadFrames,

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

    $shaderWriteBuffer[5] > 300 && ($deadFrames = -120),

    requestAnimationFrame($main)
),
$init(),$main()