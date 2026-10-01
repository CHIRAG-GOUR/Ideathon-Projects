package android.opengl;

import java.nio.Buffer;
import java.nio.FloatBuffer;
import java.util.IdentityHashMap;
import java.util.Locale;
import java.util.Map;

/**
 * TEST-ONLY stand-in for android.opengl.GLES20: records the app's GL calls as JSON so test/render.mjs can replay
 * them in WebGL (same GLSL ES 1.00) and screenshot the real Android scene. Never packaged into the app.
 */
public final class GLES20 {
    public static final int GL_BLEND = 0x0BE2, GL_COLOR_BUFFER_BIT = 0x4000, GL_COMPILE_STATUS = 0x8B81, GL_DEPTH_BUFFER_BIT = 0x100,
            GL_DEPTH_TEST = 0x0B71, GL_FLOAT = 0x1406, GL_FRAGMENT_SHADER = 0x8B30, GL_ONE = 1, GL_ONE_MINUS_SRC_ALPHA = 0x0303,
            GL_SCISSOR_TEST = 0x0C11, GL_SRC_ALPHA = 0x0302, GL_TRIANGLES = 4, GL_VERTEX_SHADER = 0x8B31;

    static StringBuilder log = new StringBuilder();
    static final StringBuilder buffers = new StringBuilder();
    static final Map<Buffer, Integer> ids = new IdentityHashMap<>();
    static int next = 1;
    static final Map<String, Integer> uniforms = new java.util.HashMap<>();

    static void cmd(String name, Object... a) {
        log.append(log.length() == 0 ? "" : ",").append("[\"").append(name).append('"');
        for (Object x : a) {
            log.append(',');
            if (x instanceof String) log.append('"').append(((String) x).replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n")).append('"');
            else if (x instanceof Float) log.append(String.format(Locale.US, "%.6g", (Float) x));
            else if (x instanceof float[]) {
                float[] f = (float[]) x;
                log.append('[');
                for (int i = 0; i < f.length; i++) log.append(i == 0 ? "" : ",").append(String.format(Locale.US, "%.6g", f[i]));
                log.append(']');
            } else log.append(x);
        }
        log.append(']');
    }

    static String setup = "";

    /** Keeps everything recorded so far (shader/program creation) as setup that precedes every frame. */
    public static void markSetup() {
        setup = log.toString();
        log = new StringBuilder();
    }

    /** Starts a new frame's command list; setup and vertex buffers are kept. */
    public static void resetFrame() {
        log = new StringBuilder();
    }

    public static String json() {
        return "{\"buffers\":{" + buffers + "},\"frame\":[" + setup + (setup.isEmpty() || log.length() == 0 ? "" : ",") + log + "]}";
    }

    public static int glCreateShader(int type) { int id = next++; cmd("createShader", id, type); return id; }
    public static void glShaderSource(int s, String src) { cmd("shaderSource", s, src); }
    public static void glCompileShader(int s) { cmd("compileShader", s); }
    public static void glGetShaderiv(int s, int p, int[] out, int off) { out[off] = 1; }
    public static String glGetShaderInfoLog(int s) { return ""; }
    public static int glCreateProgram() { int id = next++; cmd("createProgram", id); return id; }
    public static void glAttachShader(int p, int s) { cmd("attachShader", p, s); }
    public static void glLinkProgram(int p) { cmd("linkProgram", p); }
    public static void glUseProgram(int p) { cmd("useProgram", p); }
    public static int glGetAttribLocation(int p, String n) { int id = next++; cmd("attrib", p, n, id); return id; }
    public static int glGetUniformLocation(int p, String n) { int id = next++; cmd("uniform", p, n, id); return id; }
    public static void glEnable(int c) { cmd("enable", c); }
    public static void glDisable(int c) { cmd("disable", c); }
    public static void glBlendFunc(int a, int b) { cmd("blendFunc", a, b); }
    public static void glDepthMask(boolean f) { cmd("depthMask", f); }
    public static void glClearColor(float r, float g, float b, float a) { cmd("clearColor", r, g, b, a); }
    public static void glClear(int m) { cmd("clear", m); }
    public static void glViewport(int x, int y, int w, int h) { cmd("viewport", x, y, w, h); }
    public static void glScissor(int x, int y, int w, int h) { cmd("scissor", x, y, w, h); }
    public static void glUniform1f(int l, float x) { cmd("u1f", l, x); }
    public static void glUniform3f(int l, float x, float y, float z) { cmd("u3f", l, x, y, z); }
    public static void glUniform4f(int l, float x, float y, float z, float w) { cmd("u4f", l, x, y, z, w); }
    public static void glUniformMatrix4fv(int l, int n, boolean t, float[] m, int off) { cmd("um4", l, java.util.Arrays.copyOfRange(m, off, off + 16)); }
    public static void glEnableVertexAttribArray(int i) { cmd("enableAttrib", i); }
    public static void glDrawArrays(int mode, int first, int count) { cmd("drawArrays", mode, first, count); }

    public static void glVertexAttribPointer(int idx, int size, int type, boolean norm, int stride, Buffer b) {
        Integer id = ids.get(b);
        if (id == null) {
            ids.put(b, id = next++);
            FloatBuffer f = ((FloatBuffer) b).duplicate();
            f.position(0);
            float[] all = new float[f.capacity()];
            f.get(all);
            StringBuilder s = new StringBuilder();
            for (int i = 0; i < all.length; i++) s.append(i == 0 ? "" : ",").append(String.format(Locale.US, "%.5g", all[i]));
            buffers.append(buffers.length() == 0 ? "" : ",").append('"').append(id).append("\":[").append(s).append(']');
        }
        cmd("attribPointer", idx, size, stride, b.position() * 4, id);
    }
}
