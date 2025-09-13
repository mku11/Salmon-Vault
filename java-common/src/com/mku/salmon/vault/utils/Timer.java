package com.mku.salmon.vault.utils;

public class Timer extends Thread {
    private final Runnable runnable;
    private final int delay;
    private boolean quit = false;
    private boolean waiting = false;

    public Timer(Runnable runnable, int delay) {
        this.runnable = runnable;
        this.delay = delay;
    }

    @Override
    public void run() {
        while (!quit) {
            try {
                waiting = true;
                Thread.sleep(delay);
            } catch (InterruptedException ignored) {
            }
            waiting = false;
            runnable.run();
        }
    }

    public void cancel() {
        quit = true;
        if(waiting)
            interrupt();
    }
}
