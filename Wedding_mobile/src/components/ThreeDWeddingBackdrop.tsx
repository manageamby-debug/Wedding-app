import { useEffect, useRef } from "react";
import { StyleSheet } from "react-native";
import { GLView, type ExpoWebGLRenderingContext } from "expo-gl";

const vertexShader = `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const fragmentShader = `
precision mediump float;
varying vec2 v_uv;
uniform vec2 u_resolution;
uniform float u_time;

float diamondDistanceField(vec3 p, float size) {
  p = abs(p);
  float corner = p.x + p.y + p.z - size;
  vec3 face;
  if (3.0 * p.x < corner) face = p.xyz;
  else if (3.0 * p.y < corner) face = p.yzx;
  else if (3.0 * p.z < corner) face = p.zxy;
  else return corner * 0.57735027;
  float cut = clamp(0.5 * (face.z - face.y + size), 0.0, size);
  return length(vec3(face.x, face.y - size + cut, face.z - cut));
}

mat3 rotateY(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c);
}

mat3 rotateX(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c);
}

vec3 rotateScene(vec3 p) {
  float sway = sin(u_time * 0.42) * 0.13;
  float turn = sin(u_time * 0.28) * 0.23;
  return 3.3 * rotateY(turn) * rotateX(sway) * (p - vec3(0.0, 0.65, 0.0));
}

float bandDistance(vec3 p) {
  // Rounded rectangular cross-section gives each band a substantial jeweller's profile.
  vec2 ring = vec2(length(p.xy) - 0.53, p.z);
  vec2 box = abs(ring) - vec2(0.063, 0.047);
  return length(max(box, 0.0)) + min(max(box.x, box.y), 0.0) - 0.014;
}

vec3 ringOnePoint(vec3 p) {
  return rotateX(0.18) * rotateY(-0.08) * (p - vec3(-0.265, 0.0, 0.035));
}

vec3 ringTwoPoint(vec3 p) {
  return rotateY(0.82) * rotateX(-0.25) * (p - vec3(0.265, 0.015, -0.055));
}

float diamondDistance(vec3 p) {
  vec3 ring = ringOnePoint(p);
  return diamondDistanceField(ring - vec3(0.0, 0.59, 0.01), 0.082);
}

float sceneDistance(vec3 p) {
  vec3 q = rotateScene(p);
  return min(min(bandDistance(ringOnePoint(q)), bandDistance(ringTwoPoint(q))), diamondDistance(q)) / 3.3;
}

vec3 sceneNormal(vec3 p) {
  vec2 e = vec2(0.0015, 0.0);
  return normalize(vec3(
    sceneDistance(p + e.xyy) - sceneDistance(p - e.xyy),
    sceneDistance(p + e.yxy) - sceneDistance(p - e.yxy),
    sceneDistance(p + e.yyx) - sceneDistance(p - e.yyx)
  ));
}

void main() {
  vec2 screen = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
  vec3 rayOrigin = vec3(0.0, 0.0, 3.25);
  vec3 rayDirection = normalize(vec3(screen, -1.75));
  vec3 color = mix(vec3(0.045, 0.035, 0.034), vec3(0.09, 0.055, 0.042), v_uv.y);

  float warmGlow = exp(-dot(screen - vec2(0.22, 0.56), screen - vec2(0.22, 0.56)) * 2.4);
  color += vec3(0.24, 0.13, 0.055) * warmGlow * 0.35;

  float distanceAlongRay = 0.0;
  float materialId = 0.0;
  vec3 hit = rayOrigin;
  for (int i = 0; i < 44; i++) {
    hit = rayOrigin + rayDirection * distanceAlongRay;
    vec3 local = rotateScene(hit);
    float goldBand = bandDistance(ringOnePoint(local)) / 3.3;
    float platinumBand = bandDistance(ringTwoPoint(local)) / 3.3;
    float diamond = diamondDistance(local) / 3.3;
    float stepDistance = min(min(goldBand, platinumBand), diamond);
    if (stepDistance < 0.0025) {
      materialId = diamond <= min(goldBand, platinumBand) ? 3.0 : (goldBand <= platinumBand ? 1.0 : 2.0);
      break;
    }
    distanceAlongRay += stepDistance;
    if (distanceAlongRay > 7.0) break;
  }

  if (distanceAlongRay <= 7.0 && materialId > 0.5) {
    vec3 normal = sceneNormal(hit);
    vec3 lightDirection = normalize(vec3(-0.7, 1.1, 2.3));
    vec3 viewDirection = normalize(rayOrigin - hit);
    float diffuse = max(dot(normal, lightDirection), 0.0);
    float fresnel = pow(1.0 - max(dot(normal, viewDirection), 0.0), 3.0);
    float specularPower = materialId > 2.5 ? 54.0 : 38.0;
    float specular = pow(max(dot(reflect(-lightDirection, normal), viewDirection), 0.0), specularPower);
    vec3 metal = materialId < 1.5 ? vec3(0.75, 0.40, 0.16) : (materialId < 2.5 ? vec3(0.54, 0.60, 0.67) : vec3(0.69, 0.80, 0.86));
    vec3 highlight = materialId > 2.5 ? vec3(0.83, 0.92, 1.0) : vec3(1.0, 0.78, 0.48);
    color = metal * (0.18 + diffuse * 0.58) + highlight * (fresnel * 0.63 + specular * 1.15);
  }

  float vignette = 1.0 - smoothstep(0.2, 1.45, length(screen * vec2(0.72, 0.55)));
  color *= 0.72 + vignette * 0.28;
  gl_FragColor = vec4(color, 1.0);
}
`;

export default function ThreeDWeddingBackdrop() {
  const frameRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const onContextCreate = (gl: ExpoWebGLRenderingContext) => {
    const compileShader = (kind: number, source: string) => {
      const shader = gl.createShader(kind);
      if (!shader) throw new Error("Could not create the background shader.");
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(shader) ?? "Shader compilation failed.";
        gl.deleteShader(shader);
        throw new Error(message);
      }
      return shader;
    };

    try {
      const program = gl.createProgram();
      if (!program) throw new Error("Could not create the background renderer.");
      const vertex = compileShader(gl.VERTEX_SHADER, vertexShader);
      const fragment = compileShader(gl.FRAGMENT_SHADER, fragmentShader);
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.linkProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) ?? "Shader link failed.");
      }

      const vertices = gl.createBuffer();
      if (!vertices) throw new Error("Could not create the background geometry.");
      gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      gl.useProgram(program);

      const position = gl.getAttribLocation(program, "a_position");
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      const resolution = gl.getUniformLocation(program, "u_resolution");
      const time = gl.getUniformLocation(program, "u_time");
      gl.uniform2f(resolution, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

      let lastDraw = 0;
      const draw = (timestamp: number) => {
        if (!mountedRef.current) return;
        if (timestamp - lastDraw >= 33) {
          gl.uniform1f(time, timestamp * 0.001);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
          gl.endFrameEXP();
          lastDraw = timestamp;
        }
        frameRef.current = requestAnimationFrame(draw);
      };
      frameRef.current = requestAnimationFrame(draw);
    } catch (error) {
      console.warn("The animated wedding background could not start.", error);
    }
  };

  return <GLView onContextCreate={onContextCreate} style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]} />;
}
