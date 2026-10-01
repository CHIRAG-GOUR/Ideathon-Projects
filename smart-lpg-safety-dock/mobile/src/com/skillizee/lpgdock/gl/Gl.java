package com.skillizee.lpgdock.gl;

import android.opengl.GLES20;
import android.opengl.Matrix;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.FloatBuffer;
import java.util.ArrayList;
import java.util.List;

/** Minimal OpenGL ES 2.0 toolkit: one lit shader, procedural meshes and a matrix stack. No external assets. */
public final class Gl {
    static final String VS =
            "uniform mat4 uMVP; uniform mat4 uModel;"
                    + "attribute vec3 aPos; attribute vec3 aNor;"
                    + "varying vec3 vN; varying vec3 vW;"
                    + "void main(){ vec4 w = uModel*vec4(aPos,1.0); vW = w.xyz; vN = (uModel*vec4(aNor,0.0)).xyz; gl_Position = uMVP*vec4(aPos,1.0); }";
    static final String FS =
            "precision mediump float;"
                    + "uniform vec4 uColor; uniform vec3 uEmissive; uniform vec3 uLightDir; uniform vec3 uCam; uniform vec3 uFogColor;"
                    + "uniform vec3 uPointPos; uniform vec3 uPointColor; uniform float uUnlit;"
                    + "varying vec3 vN; varying vec3 vW;"
                    + "void main(){"
                    + " vec3 n = normalize(vN);"
                    + " float d = max(dot(n, normalize(uLightDir)), 0.0);"
                    + " float hemi = 0.5 + 0.5*n.y;"
                    + " vec3 amb = mix(vec3(0.52,0.47,0.42), vec3(0.96,0.92,0.84), hemi)*0.58;"
                    + " vec3 toP = uPointPos - vW; float dist = length(toP);"
                    + " float pl = max(dot(n, toP/max(dist,0.001)), 0.0)/(1.0 + dist*dist*0.5);"
                    + " vec3 lit = uColor.rgb*(amb + d*vec3(1.0,0.95,0.86)*0.72 + uPointColor*pl) + uEmissive;"
                    + " lit = min(lit, vec3(0.82)) + (1.0 - exp(-max(lit - 0.82, 0.0)*3.0))*0.18;" // soft shoulder: white cloth never clips to a glare
                    + " vec3 col = mix(lit, uColor.rgb + uEmissive, uUnlit);"
                    + " float f = clamp((length(vW - uCam) - 7.0)/14.0, 0.0, 0.5);"
                    + " gl_FragColor = vec4(mix(col, uFogColor, f), uColor.a);"
                    + "}";

    public static final class Mesh {
        final FloatBuffer buf;
        final int count;

        Mesh(float[] data) {
            buf = ByteBuffer.allocateDirect(data.length * 4).order(ByteOrder.nativeOrder()).asFloatBuffer();
            buf.put(data).position(0);
            count = data.length / 6;
        }
    }

    int prog, aPos, aNor, uMVP, uModel, uColor, uEmissive, uLightDir, uCam, uFogColor, uPointPos, uPointColor, uUnlit;
    public Mesh box, cyl, sphere, cone, torus, quad;
    public final float[] view = new float[16], proj = new float[16], vp = new float[16];
    final float[] mvp = new float[16];
    final float[][] stack = new float[32][16];
    int sp;
    public float[] cam = new float[3];
    float[] point = new float[3], pointColor = new float[3];

    public void init() {
        prog = link(VS, FS);
        aPos = GLES20.glGetAttribLocation(prog, "aPos");
        aNor = GLES20.glGetAttribLocation(prog, "aNor");
        uMVP = GLES20.glGetUniformLocation(prog, "uMVP");
        uModel = GLES20.glGetUniformLocation(prog, "uModel");
        uColor = GLES20.glGetUniformLocation(prog, "uColor");
        uEmissive = GLES20.glGetUniformLocation(prog, "uEmissive");
        uLightDir = GLES20.glGetUniformLocation(prog, "uLightDir");
        uCam = GLES20.glGetUniformLocation(prog, "uCam");
        uFogColor = GLES20.glGetUniformLocation(prog, "uFogColor");
        uPointPos = GLES20.glGetUniformLocation(prog, "uPointPos");
        uPointColor = GLES20.glGetUniformLocation(prog, "uPointColor");
        uUnlit = GLES20.glGetUniformLocation(prog, "uUnlit");
        box = new Mesh(boxData());
        cyl = new Mesh(cylData(28, 1f, 1f));
        cone = new Mesh(cylData(10, 0f, 1f));
        sphere = new Mesh(sphereData(16, 12));
        torus = new Mesh(torusData(40, 8, 1f, 0.06f));
        quad = new Mesh(new float[] {-.5f, 0, -.5f, 0, 1, 0, .5f, 0, .5f, 0, 1, 0, .5f, 0, -.5f, 0, 1, 0, -.5f, 0, -.5f, 0, 1, 0, -.5f, 0, .5f, 0, 1, 0, .5f, 0, .5f, 0, 1, 0});
        GLES20.glEnable(GLES20.GL_DEPTH_TEST);
    }

    static int shader(int type, String src) {
        int s = GLES20.glCreateShader(type);
        GLES20.glShaderSource(s, src);
        GLES20.glCompileShader(s);
        int[] ok = new int[1];
        GLES20.glGetShaderiv(s, GLES20.GL_COMPILE_STATUS, ok, 0);
        if (ok[0] == 0) throw new RuntimeException("Shader: " + GLES20.glGetShaderInfoLog(s));
        return s;
    }

    static int link(String vs, String fs) {
        int p = GLES20.glCreateProgram();
        GLES20.glAttachShader(p, shader(GLES20.GL_VERTEX_SHADER, vs));
        GLES20.glAttachShader(p, shader(GLES20.GL_FRAGMENT_SHADER, fs));
        GLES20.glLinkProgram(p);
        return p;
    }

    /** Camera + global lighting for this frame/viewport. */
    public void begin(float aspect, float fovY, float ex, float ey, float ez, float tx, float ty, float tz, float[] fog) {
        Matrix.perspectiveM(proj, 0, fovY, aspect, 0.1f, 60f);
        Matrix.setLookAtM(view, 0, ex, ey, ez, tx, ty, tz, 0, 1, 0);
        Matrix.multiplyMM(vp, 0, proj, 0, view, 0);
        cam[0] = ex;
        cam[1] = ey;
        cam[2] = ez;
        GLES20.glUseProgram(prog);
        GLES20.glUniform3f(uLightDir, 0.45f, 0.85f, 0.5f);
        GLES20.glUniform3f(uCam, ex, ey, ez);
        GLES20.glUniform3f(uFogColor, fog[0], fog[1], fog[2]);
        GLES20.glUniform1f(uUnlit, 0);
        sp = 0;
        Matrix.setIdentityM(stack[0], 0);
    }

    public void pointLight(float x, float y, float z, float r, float g, float b) {
        GLES20.glUniform3f(uPointPos, x, y, z);
        GLES20.glUniform3f(uPointColor, r, g, b);
    }

    // ---- matrix stack
    public void push() {
        System.arraycopy(stack[sp], 0, stack[sp + 1], 0, 16);
        sp++;
    }

    public void pop() {
        sp--;
    }

    public void t(float x, float y, float z) {
        Matrix.translateM(stack[sp], 0, x, y, z);
    }

    public void rx(float rad) {
        Matrix.rotateM(stack[sp], 0, (float) Math.toDegrees(rad), 1, 0, 0);
    }

    public void ry(float rad) {
        Matrix.rotateM(stack[sp], 0, (float) Math.toDegrees(rad), 0, 1, 0);
    }

    public void rz(float rad) {
        Matrix.rotateM(stack[sp], 0, (float) Math.toDegrees(rad), 0, 0, 1);
    }

    public void s(float x, float y, float z) {
        Matrix.scaleM(stack[sp], 0, x, y, z);
    }

    public void unlit(boolean on) {
        GLES20.glUniform1f(uUnlit, on ? 1 : 0);
    }

    /** Draw a mesh with the current matrix (optionally an extra local translate/scale). */
    public void draw(Mesh m, int rgb, float alpha, int emissive) {
        Matrix.multiplyMM(mvp, 0, vp, 0, stack[sp], 0);
        GLES20.glUniformMatrix4fv(uMVP, 1, false, mvp, 0);
        GLES20.glUniformMatrix4fv(uModel, 1, false, stack[sp], 0);
        GLES20.glUniform4f(uColor, ((rgb >> 16) & 255) / 255f, ((rgb >> 8) & 255) / 255f, (rgb & 255) / 255f, alpha);
        GLES20.glUniform3f(uEmissive, ((emissive >> 16) & 255) / 255f, ((emissive >> 8) & 255) / 255f, (emissive & 255) / 255f);
        m.buf.position(0);
        GLES20.glVertexAttribPointer(aPos, 3, GLES20.GL_FLOAT, false, 24, m.buf);
        GLES20.glEnableVertexAttribArray(aPos);
        m.buf.position(3);
        GLES20.glVertexAttribPointer(aNor, 3, GLES20.GL_FLOAT, false, 24, m.buf);
        GLES20.glEnableVertexAttribArray(aNor);
        GLES20.glDrawArrays(GLES20.GL_TRIANGLES, 0, m.count);
    }

    public void draw(Mesh m, int rgb) {
        draw(m, rgb, 1f, 0);
    }

    /** Convenience: a box/cylinder/sphere at a position with a size. */
    public void at(Mesh m, float x, float y, float z, float sx, float sy, float sz, int rgb) {
        push();
        t(x, y, z);
        s(sx, sy, sz);
        draw(m, rgb);
        pop();
    }

    /** Project a world point to viewport pixels (for labels and picking). */
    public static boolean project(float[] vp, float x, float y, float z, int w, int h, float[] out) {
        float[] p = {x, y, z, 1}, r = new float[4];
        Matrix.multiplyMV(r, 0, vp, 0, p, 0);
        if (r[3] <= 0) return false;
        out[0] = (r[0] / r[3] * 0.5f + 0.5f) * w;
        out[1] = (1 - (r[1] / r[3] * 0.5f + 0.5f)) * h;
        return true;
    }

    // ---- procedural meshes (position + normal, counter-clockwise front faces)
    static void tri(List<Float> o, float[] a, float[] b, float[] c, float[] n) {
        for (float[] v : new float[][] {a, b, c}) {
            o.add(v[0]);
            o.add(v[1]);
            o.add(v[2]);
            o.add(n[0]);
            o.add(n[1]);
            o.add(n[2]);
        }
    }

    static float[] arr(List<Float> l) {
        float[] a = new float[l.size()];
        for (int i = 0; i < a.length; i++) a[i] = l.get(i);
        return a;
    }

    static float[] boxData() {
        List<Float> o = new ArrayList<>();
        float h = 0.5f;
        float[][] n = {{1, 0, 0}, {-1, 0, 0}, {0, 1, 0}, {0, -1, 0}, {0, 0, 1}, {0, 0, -1}};
        for (float[] f : n) {
            float[] u = Math.abs(f[1]) > 0 ? new float[] {1, 0, 0} : new float[] {0, 1, 0};
            float[] v = {f[1] * u[2] - f[2] * u[1], f[2] * u[0] - f[0] * u[2], f[0] * u[1] - f[1] * u[0]};
            float[][] q = new float[4][3];
            for (int k = 0; k < 4; k++) {
                float su = (k == 0 || k == 3) ? -h : h, sv = (k < 2) ? -h : h;
                for (int i = 0; i < 3; i++) q[k][i] = f[i] * h + u[i] * su + v[i] * sv;
            }
            tri(o, q[0], q[1], q[2], f);
            tri(o, q[0], q[2], q[3], f);
        }
        return arr(o);
    }

    /** Cylinder/cone along Y, height 1 centred at 0; rTop/rBottom radii. */
    static float[] cylData(int seg, float rTop, float rBot) {
        List<Float> o = new ArrayList<>();
        for (int i = 0; i < seg; i++) {
            double a0 = 2 * Math.PI * i / seg, a1 = 2 * Math.PI * (i + 1) / seg;
            float c0 = (float) Math.cos(a0), s0 = (float) Math.sin(a0), c1 = (float) Math.cos(a1), s1 = (float) Math.sin(a1);
            float slope = (rBot - rTop);
            float[] n0 = norm(c0, slope, s0), n1 = norm(c1, slope, s1);
            float[] b0 = {c0 * rBot, -.5f, s0 * rBot}, b1 = {c1 * rBot, -.5f, s1 * rBot}, t0 = {c0 * rTop, .5f, s0 * rTop}, t1 = {c1 * rTop, .5f, s1 * rTop};
            // side (two triangles, per-vertex normals averaged by using face normal of mid angle)
            float[] nm = norm((c0 + c1) / 2, slope, (s0 + s1) / 2);
            tri(o, b0, t1, b1, nm);
            tri(o, b0, t0, t1, nm);
            if (rTop > 0) tri(o, new float[] {0, .5f, 0}, t1, t0, new float[] {0, 1, 0});
            if (rBot > 0) tri(o, new float[] {0, -.5f, 0}, b0, b1, new float[] {0, -1, 0});
            n0[0] += 0;
            n1[0] += 0;
        }
        return arr(o);
    }

    static float[] norm(float x, float y, float z) {
        float l = (float) Math.sqrt(x * x + y * y + z * z);
        return new float[] {x / l, y / l, z / l};
    }

    static float[] sphereData(int seg, int rings) {
        List<Float> o = new ArrayList<>();
        for (int r = 0; r < rings; r++) {
            double p0 = Math.PI * r / rings, p1 = Math.PI * (r + 1) / rings;
            for (int i = 0; i < seg; i++) {
                double a0 = 2 * Math.PI * i / seg, a1 = 2 * Math.PI * (i + 1) / seg;
                float[] v00 = sph(p0, a0), v01 = sph(p0, a1), v10 = sph(p1, a0), v11 = sph(p1, a1);
                triS(o, v00, v11, v10);
                triS(o, v00, v01, v11);
            }
        }
        return arr(o);
    }

    static float[] sph(double p, double a) {
        return new float[] {(float) (Math.sin(p) * Math.cos(a)), (float) Math.cos(p), (float) (Math.sin(p) * Math.sin(a))};
    }

    static void triS(List<Float> o, float[] a, float[] b, float[] c) {
        for (float[] v : new float[][] {a, b, c}) {
            o.add(v[0]);
            o.add(v[1]);
            o.add(v[2]);
            o.add(v[0]);
            o.add(v[1]);
            o.add(v[2]);
        }
    }

    /** Torus around Y (ring in the XZ plane). */
    static float[] torusData(int seg, int side, float R, float r) {
        List<Float> o = new ArrayList<>();
        for (int i = 0; i < seg; i++)
            for (int j = 0; j < side; j++) {
                float[][] q = new float[4][], qn = new float[4][];
                int[][] ij = {{i, j}, {i + 1, j}, {i + 1, j + 1}, {i, j + 1}};
                for (int k = 0; k < 4; k++) {
                    double u = 2 * Math.PI * ij[k][0] / seg, v = 2 * Math.PI * ij[k][1] / side;
                    float cx = (float) Math.cos(u), cz = (float) Math.sin(u);
                    float nx = (float) (Math.cos(v) * cx), ny = (float) Math.sin(v), nz = (float) (Math.cos(v) * cz);
                    q[k] = new float[] {R * cx + r * nx, r * ny, R * cz + r * nz};
                    qn[k] = new float[] {nx, ny, nz};
                }
                for (int[] t : new int[][] {{0, 2, 1}, {0, 3, 2}})
                    for (int k : t) {
                        o.add(q[k][0]);
                        o.add(q[k][1]);
                        o.add(q[k][2]);
                        o.add(qn[k][0]);
                        o.add(qn[k][1]);
                        o.add(qn[k][2]);
                    }
            }
        return arr(o);
    }
}
