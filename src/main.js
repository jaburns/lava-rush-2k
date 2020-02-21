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
    $shaderWriteBuffer = [0,0,0,-30,0,40,0,0],
    $shaderReadBuffer = new Uint8Array(8),
    $vx =
    $vy =
    $vz =
    $vx1 =
    $vz1 =
    $score =
    $canJump = 0,
    $keys = {}
),

$sensitivity = .003,

a.onclick = $a => (
    a.requestPointerLock(),
    a.onmousemove = a.onmousemove || ($a => DEAD_FRAMES == 0 && (
        PLAYER_YAW += $sensitivity*$a.movementX,
        PLAYER_PITCH -= $sensitivity*$a.movementY
    ))
),

document.onkeydown = $a => (
    $a.keyCode > 48 && $a.keyCode < 58 && ($sensitivity = .0005*($a.keyCode-48)),
    $keys[$a.keyCode] = 1
),

document.onkeyup = $a => $keys[$a.keyCode] = 0,

$readFloat = $a => ($shaderReadBuffer[$a]/255 + $shaderReadBuffer[$a+1]/255/255)*2 - 1,

$main = $a => (
    DEAD_FRAMES > 180 && $init(),

    $vy -= .02,
    PLAYER_Y += $vy,

    $vx = $vz = 0,
    $keys[87] && ($vx += Math.sin(PLAYER_YAW), $vz += Math.cos(PLAYER_YAW)),
    $keys[83] && ($vx -= Math.sin(PLAYER_YAW), $vz -= Math.cos(PLAYER_YAW)),
    $keys[68] && ($vx += Math.cos(PLAYER_YAW), $vz -= Math.sin(PLAYER_YAW)),
    $keys[65] && ($vx -= Math.cos(PLAYER_YAW), $vz += Math.sin(PLAYER_YAW)),
    $keys[32] && $canJump && (PLAYER_Y += ($vy = .5), $canJump = 0),
    $vx && $vz && (
        $vx /= Math.sqrt($vz*$vz + $vx*$vx),
        $vz /= Math.sqrt($vz*$vz + $vx*$vx)),

    $vx1 += ($vx - $vx1)/5,
    $vz1 += ($vz - $vz1)/5,

    PLAYER_X += .4*$vx1,
    PLAYER_Z += .4*$vz1,

    LAVA_LEVEL += .05,
    (PLAYER_Y < LAVA_LEVEL + 1 || DEAD_FRAMES < 0)
        && DEAD_FRAMES++
        || (s.innerText = ($score = PLAYER_Y > $score ? PLAYER_Y|0 : $score)),

    g.readPixels(
        g.drawArrays(
            g.TRIANGLES,
            g.uniform4fv(g.getUniformLocation($shader, 'g'), $shaderWriteBuffer),
            3
        ),
        0, 2, 1, g.RGBA, g.UNSIGNED_BYTE, $shaderReadBuffer
    ),

    PLAYER_X += $readFloat(0),
    PLAYER_Y += $readFloat(2),
    PLAYER_Z += $readFloat(4),
    $shaderReadBuffer[6] && ( $vy = 0, $canJump = 1 ),

    requestAnimationFrame($main)
),
$init(),$main()