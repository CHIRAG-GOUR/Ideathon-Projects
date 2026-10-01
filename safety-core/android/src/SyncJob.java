package @PKG@;

import android.app.job.JobInfo;
import android.app.job.JobParameters;
import android.app.job.JobScheduler;
import android.app.job.JobService;
import android.content.ComponentName;
import android.content.Context;

/**
 * Delivers a queued SOS (started or ended offline) and queued check updates as soon as any network is available,
 * even if the app and the SOS service are no longer running.
 */
public class SyncJob extends JobService {
    private static final int ID = 4401;

    static void schedule(Context c) {
        JobInfo job = new JobInfo.Builder(ID, new ComponentName(c, SyncJob.class))
                .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                .setBackoffCriteria(30_000, JobInfo.BACKOFF_POLICY_EXPONENTIAL)
                .setPersisted(true)
                .build();
        c.getSystemService(JobScheduler.class).schedule(job);
    }

    @Override
    public boolean onStartJob(final JobParameters params) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                Store s = new Store(SyncJob.this);
                boolean sosDone = Sos.sync(SyncJob.this) || Sos.isActive(s.get("sos")); // an active SOS is synced by SosService
                if (sosDone && s.get("sos") != null && !Sos.isActive(s.get("sos"))) s.put("sos", null);
                boolean outDone = Outbox.flush(SyncJob.this);
                jobFinished(params, !(sosDone && outDone));
            }
        }).start();
        return true;
    }

    @Override
    public boolean onStopJob(JobParameters params) {
        return true;
    }
}
