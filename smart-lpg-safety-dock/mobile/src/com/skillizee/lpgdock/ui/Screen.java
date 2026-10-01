package com.skillizee.lpgdock.ui;

import android.view.View;

/** A top-level screen. build() once; update() ~12×/s while visible; show()/hide() for GL pause/resume. */
public abstract class Screen {
    protected final MainActivity a;
    View root;

    protected Screen(MainActivity a) {
        this.a = a;
    }

    public final View view() {
        if (root == null) root = build();
        return root;
    }

    protected abstract View build();

    public void update() {}

    public void show() {}

    public void hide() {}
}
