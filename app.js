import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cfg = window.VYRO_CONFIG || {};

const configured =
  cfg.SUPABASE_URL &&
  cfg.SUPABASE_ANON_KEY &&
  !cfg.SUPABASE_URL.includes('PASTE_');

const supabase = configured
  ? createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY)
  : null;

const app = document.getElementById('app');
const authScreen = document.getElementById('authScreen');
const appShell = document.getElementById('appShell');

const state = {
  page: 'home',
  role: 'client',
  profile: null,
  categories: []
};

let authMode = 'login';

const esc = s =>
  String(s ?? '').replace(/[&<>'"]/g, c => ({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    "'":'&#39;',
    '"':'&quot;'
  }[c]));

function msg(text) {
  const el = document.getElementById('authMessage');
  if (el) el.textContent = text;
}

function shell(content) {
  app.innerHTML = `<section class="page">${content}</section>`;
}

function money(amount, currency = 'USD') {
  return `${currency === 'USD' ? '$' : currency + ' '}${Number(amount || 0).toLocaleString()}`;
}

function navLabels() {
  const nav = document.querySelectorAll('.nav');

  if (nav[0]) {
    nav[0].querySelector('small').textContent = 'Home';
  }

  if (nav[1]) {
    nav[1].querySelector('small').textContent =
      state.role === 'freelancer' ? 'Find Jobs' : 'Freelancers';
  }

  if (nav[3]) {
    nav[3].querySelector('small').textContent = 'Messages';
  }

  if (nav[4]) {
    nav[4].querySelector('small').textContent = 'Profile';
  }
}

async function getUser() {
  return (await supabase.auth.getUser()).data.user;
}

async function ensureMarketplaceProfile() {
  const user = await getUser();

  if (!user) return null;

  let { data } = await supabase
    .from('marketplace_profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (!data) {
    const username =
      user.user_metadata?.username ||
      user.email?.split('@')[0] ||
      'vyro_user';

    const { data: created } = await supabase
      .from('marketplace_profiles')
      .insert({
        id: user.id,
        username,
        display_name: username,
        role: 'client'
      })
      .select()
      .single();

    data = created;
  }

  state.profile = data;
  state.role = data?.role || 'client';

  return data;
}

async function loadCategories() {
  const { data } = await supabase
    .from('service_categories')
    .select('*')
    .order('name');

  state.categories = data || [];
}

function categoryCards() {
  const fallback = [
    ['🎨','Graphic Design'],
    ['🎬','Video Editing'],
    ['💻','Programming'],
    ['✍️','Writing & Translation'],
    ['📢','Digital Marketing'],
    ['🤖','AI Services'],
    ['📸','Photography'],
    ['🎙️','Voice Over']
  ];

  const cats = state.categories.length
    ? state.categories.map(c => [c.icon || '⭐', c.name])
    : fallback;

  return cats.map(([icon,name]) => `
    <button class="card service-card" data-category="${esc(name)}">
      <div class="service-icon">${icon}</div>
      <h3>${esc(name)}</h3>
      <p class="meta">Find talented professionals</p>
    </button>
  `).join('');
}


/* =========================
   HOME
========================= */

async function home() {
  await ensureMarketplaceProfile();
  await loadCategories();

  shell(`
    <div class="hero">
      <div class="eyebrow">🌍 VYRO MARKETPLACE</div>

      <h1>Find the right talent for your next project.</h1>

      <p>
        Hire skilled professionals or find your next opportunity —
        anywhere in the world.
      </p>

      <div class="search-box">
        <input id="serviceSearch" placeholder="Search for a service..." />
        <button class="primary" id="searchServices">Search</button>
      </div>

      <div class="hero-actions">

        <button class="primary" id="postJobHome">
          Post a Job
        </button>

        <button class="tool" id="findWorkHome">
          ${state.role === 'freelancer'
            ? 'Find Jobs'
            : 'Become a Freelancer'}
        </button>

      </div>
    </div>


    <div class="card" style="margin-bottom:18px;">
      <div class="post-body">

        <span class="tag">🏆 NEW ON VYRO</span>

        <h2>VYRO Challenges</h2>

        <p class="meta">
          Compete in real-world challenges, show your skills,
          win prizes and get discovered by clients worldwide.
        </p>

        <button class="primary" id="openChallenges">
          Explore Challenges 🏆
        </button>

        <button class="tool" id="createChallengeHome">
          Create a Challenge
        </button>

      </div>
    </div>


    <h2>Popular Services</h2>

    <div class="service-grid">
      ${categoryCards()}
    </div>


    <div class="card marketplace-intro">

      <div class="post-body">

        <span class="tag">VYRO</span>

        <h2>Work with talented people worldwide.</h2>

        <p class="meta">
          Graphic designers, video editors, developers,
          writers, marketers and many more.
        </p>

      </div>

    </div>


    <h2>How VYRO Works</h2>

    <div class="challenge-list">

      <div class="challenge">
        <b>01 · Post</b>
        <h3>Tell us what you need</h3>
        <span class="xp">
          Describe your project and set your budget.
        </span>
      </div>

      <div class="challenge">
        <b>02 · Choose</b>
        <h3>Compare freelancers</h3>
        <span class="xp">
          Review proposals, prices and profiles.
        </span>
      </div>

      <div class="challenge">
        <b>03 · Complete</b>
        <h3>Get your work done</h3>
        <span class="xp">
          Work together securely through VYRO.
        </span>
      </div>

    </div>
  `);


  document.getElementById('postJobHome')?.addEventListener(
    'click',
    postJobPage
  );


  document.getElementById('findWorkHome')?.addEventListener(
    'click',
    () => {

      if (state.role === 'freelancer') {

        state.page = 'world';
        render();

      } else {

        chooseRole();

      }

    }
  );


  document.getElementById('openChallenges')?.addEventListener(
    'click',
    () => {

      state.page = 'challenges';
      render();

    }
  );


  document.getElementById('createChallengeHome')?.addEventListener(
    'click',
    createChallengePage
  );


  document.getElementById('searchServices')?.addEventListener(
    'click',
    () => {

      const value =
        document.getElementById('serviceSearch')
          .value
          .trim();

      if (value) {

        state.page = 'world';
        render(value);

      }

    }
  );


  document.querySelectorAll('[data-category]').forEach(btn => {

    btn.addEventListener('click', () => {

      state.page = 'world';
      render(btn.dataset.category);

    });

  });

}


/* =========================
   ROLE
========================= */

function chooseRole() {

  shell(`
    <div class="hero">

      <div class="eyebrow">
        JOIN THE VYRO MARKETPLACE
      </div>

      <h1>
        How do you want to use VYRO?
      </h1>

      <p>
        You can change your role later.
      </p>

    </div>


    <div class="challenge-list">

      <button class="challenge" id="clientRole">

        <b>💼 CLIENT</b>

        <h2>
          Hire freelancers
        </h2>

        <span class="xp">
          Post jobs and find talented professionals.
        </span>

      </button>


      <button class="challenge" id="freelancerRole">

        <b>🚀 FREELANCER</b>

        <h2>
          Find work
        </h2>

        <span class="xp">
          Show your skills and earn from projects.
        </span>

      </button>

    </div>
  `);


  document.getElementById('clientRole').onclick =
    () => saveRole('client');

  document.getElementById('freelancerRole').onclick =
    () => saveRole('freelancer');
}


async function saveRole(role) {

  const user = await getUser();

  const { error } = await supabase
    .from('marketplace_profiles')
    .upsert({
      id: user.id,
      role
    });

  if (error) {

    alert(error.message);
    return;

  }

  state.role = role;

  await ensureMarketplaceProfile();

  state.page =
    role === 'freelancer'
      ? 'world'
      : 'home';

  render();
}


/* =========================
   POST JOB
========================= */

async function postJobPage() {

  await loadCategories();

  shell(`

    <div class="modal-card" style="margin:0 auto">

      <div class="modal-head">
        <h2>Post a Job</h2>
      </div>

      <p class="meta">
        Tell VYRO freelancers what you need.
      </p>

      <input
        id="jobTitle"
        placeholder="Job title e.g. Professional Logo Design"
      />

      <select id="jobCategory">

        <option value="">
          Select category
        </option>

        ${state.categories.map(c =>
          `<option value="${c.id}">
            ${esc(c.icon || '')} ${esc(c.name)}
          </option>`
        ).join('')}

      </select>

      <textarea
        id="jobDescription"
        maxlength="3000"
        placeholder="Describe exactly what you need..."
      ></textarea>

      <div class="stats">

        <div class="stat">

          <small>
            Minimum budget
          </small>

          <input
            id="budgetMin"
            type="number"
            min="0"
            placeholder="20"
          />

        </div>


        <div class="stat">

          <small>
            Maximum budget
          </small>

          <input
            id="budgetMax"
            type="number"
            min="0"
            placeholder="100"
          />

        </div>

      </div>


      <select id="jobType">

        <option value="fixed">
          Fixed Price
        </option>

        <option value="hourly">
          Hourly
        </option>

      </select>


      <input
        id="jobDeadline"
        type="date"
      />


      <button
        class="primary"
        id="publishJob"
      >
        Publish Job
      </button>


      <p
        id="jobMessage"
        class="meta"
      ></p>

    </div>

  `);


  document.getElementById('publishJob').onclick =
    publishJob;
}


async function publishJob() {

  const user = await getUser();

  const title =
    document.getElementById('jobTitle')
      .value
      .trim();

  const category_id =
    document.getElementById('jobCategory')
      .value;

  const description =
    document.getElementById('jobDescription')
      .value
      .trim();

  const budget_min =
    Number(
      document.getElementById('budgetMin')
        .value || 0
    );

  const budget_max =
    Number(
      document.getElementById('budgetMax')
        .value || 0
    );

  const job_type =
    document.getElementById('jobType')
      .value;

  const deadline =
    document.getElementById('jobDeadline')
      .value || null;

  const message =
    document.getElementById('jobMessage');


  if (!title || !description) {

    message.textContent =
      'Please enter the job title and description.';

    return;

  }


  if (budget_max < budget_min) {

    message.textContent =
      'Maximum budget cannot be lower than minimum budget.';

    return;

  }


  const { error } =
    await supabase
      .from('jobs')
      .insert({
        client_id: user.id,
        category_id: category_id || null,
        title,
        description,
        budget_min,
        budget_max,
        currency: 'USD',
        job_type,
        deadline
      });


  if (error) {

    message.textContent =
      error.message;

    return;

  }


  message.textContent =
    'Job published successfully! 🚀';


  setTimeout(() => {

    state.page = 'home';
    render();

  }, 1000);
}


/* =========================
   JOBS
========================= */

async function jobs(search = '') {

  await loadCategories();

  let query =
    supabase
      .from('jobs')
      .select('*, service_categories(name,icon)')
      .eq('status', 'open')
      .order('created_at', {
        ascending: false
      })
      .limit(50);


  if (search) {

    query =
      query.ilike(
        'title',
        `%${search}%`
      );

  }


  const { data, error } =
    await query;


  if (error) {

    shell(`
      <div class="card">

        <div class="post-body">

          <h3>
            Could not load jobs
          </h3>

          <p class="meta">
            ${esc(error.message)}
          </p>

        </div>

      </div>
    `);

    return;
  }


  shell(`

    <div class="hero">

      <div class="eyebrow">
        🚀 FIND WORK
      </div>

      <h1>
        Find your next project.
      </h1>

      <div class="search-box">

        <input
          id="jobSearch"
          value="${esc(search)}"
          placeholder="Search jobs..."
        />

        <button
          class="primary"
          id="jobSearchBtn"
        >
          Search
        </button>

      </div>

    </div>


    <h2>
      Open Jobs
    </h2>


    <div id="jobList">

      ${(data || []).length

        ? data.map(jobCard).join('')

        : `

          <div class="card">

            <div class="post-body">

              <h3>
                No jobs found yet.
              </h3>

              <p class="meta">
                New opportunities will appear here.
              </p>

            </div>

          </div>

        `

      }

    </div>

  `);


  document.getElementById('jobSearchBtn').onclick =
    () => {

      state.page = 'world';

      render(
        document.getElementById('jobSearch')
          .value
          .trim()
      );

    };


  document.querySelectorAll('[data-job]').forEach(btn => {

    btn.onclick =
      () => viewJob(btn.dataset.job);

  });

}


function jobCard(job) {

  return `

    <article class="card">

      <div class="post-body">

        <span class="tag">

          ${esc(
            job.service_categories?.icon ||
            '💼'
          )}

          ${esc(
            job.service_categories?.name ||
            'Service'
          )}

        </span>


        <h2>
          ${esc(job.title)}
        </h2>


        <p>

          ${esc(
            job.description.slice(0, 180)
          )}

          ${
            job.description.length > 180
              ? '...'
              : ''
          }

        </p>


        <div class="stats">

          <div class="stat">

            <b>
              ${money(
                job.budget_min,
                job.currency
              )}
            </b>

            <small>
              Min
            </small>

          </div>


          <div class="stat">

            <b>
              ${money(
                job.budget_max,
                job.currency
              )}
            </b>

            <small>
              Max
            </small>

          </div>


          <div class="stat">

            <b>
              ${esc(job.job_type)}
            </b>

            <small>
              Type
            </small>

          </div>

        </div>


        <button
          class="primary"
          data-job="${job.id}"
        >
          View Job
        </button>

      </div>

    </article>

  `;
}


/* =========================
   VIEW JOB
========================= */

async function viewJob(jobId) {

  const {
    data: job,
    error
  } =
    await supabase
      .from('jobs')
      .select('*, service_categories(name,icon)')
      .eq('id', jobId)
      .single();


  if (error) {

    alert(error.message);
    return;

  }


  shell(`

    <div class="card">

      <div class="post-body">

        <span class="tag">

          ${esc(
            job.service_categories?.icon ||
            '💼'
          )}

          ${esc(
            job.service_categories?.name ||
            'Service'
          )}

        </span>


        <h1>
          ${esc(job.title)}
        </h1>


        <p>
          ${esc(job.description)}
        </p>


        <div class="stats">

          <div class="stat">

            <b>
              ${money(
                job.budget_min,
                job.currency
              )}
            </b>

            <small>
              Minimum
            </small>

          </div>


          <div class="stat">

            <b>
              ${money(
                job.budget_max,
                job.currency
              )}
            </b>

            <small>
              Maximum
            </small>

          </div>


          <div class="stat">

            <b>
              ${esc(job.job_type)}
            </b>

            <small>
              Payment type
            </small>

          </div>

        </div>


        <p class="meta">

          Deadline:
          ${esc(
            job.deadline ||
            'Not specified'
          )}

        </p>


        ${
          state.role === 'freelancer'

            ? `

              <button
                class="primary"
                id="proposalBtn"
              >
                Send Proposal
              </button>

            `

            : `

              <p class="meta">
                Switch to Freelancer mode
                to apply for jobs.
              </p>

            `
        }

      </div>

    </div>

  `);


  document.getElementById('proposalBtn')
    ?.addEventListener(
      'click',
      () => proposalPage(job)
    );

}


/* =========================
   PROPOSALS
========================= */

async function proposalPage(job) {

  shell(`

    <div class="card">

      <div class="post-body">

        <span class="tag">
          SEND PROPOSAL
        </span>

        <h2>
          ${esc(job.title)}
        </h2>


        <textarea
          id="proposalText"
          maxlength="3000"
          placeholder="Tell the client why you are the right person for this job..."
        ></textarea>


        <input
          id="proposalPrice"
          type="number"
          min="1"
          placeholder="Your price in USD"
        />


        <input
          id="proposalDays"
          type="number"
          min="1"
          placeholder="Delivery days"
        />


        <button
          class="primary"
          id="sendProposal"
        >
          Send Proposal
        </button>


        <p
          id="proposalMessage"
          class="meta"
        ></p>

      </div>

    </div>

  `);


  document.getElementById('sendProposal').onclick =
    async () => {

      const user = await getUser();


      const cover_letter =
        document.getElementById('proposalText')
          .value
          .trim();


      const price =
        Number(
          document.getElementById('proposalPrice')
            .value || 0
        );


      const delivery_days =
        Number(
          document.getElementById('proposalDays')
            .value || 0
        );


      const message =
        document.getElementById('proposalMessage');


      if (
        !cover_letter ||
        !price ||
        !delivery_days
      ) {

        message.textContent =
          'Please complete all fields.';

        return;

      }


      const { error } =
        await supabase
          .from('proposals')
          .insert({
            job_id: job.id,
            freelancer_id: user.id,
            cover_letter,
            price,
            currency: 'USD',
            delivery_days
          });


      if (error) {

        message.textContent =
          error.message;

        return;

      }


      message.textContent =
        'Proposal sent successfully! 🚀';


      setTimeout(() => {

        state.page = 'world';
        render();

      }, 1000);

    };

}


/* =====================================================
   🏆 VYRO CHALLENGES
===================================================== */


/* =========================
   CHALLENGE LIST
========================= */

async function challenges() {

  const { data, error } =
    await supabase
      .from('challenges')
      .select('*')
      .order('created_at', {
        ascending: false
      });


  if (error) {

    shell(`

      <div class="card">

        <div class="post-body">

          <h2>
            Challenges
          </h2>

          <p class="meta">
            ${esc(error.message)}
          </p>

        </div>

      </div>

    `);

    return;
  }


  shell(`

    <div class="hero">

      <div class="eyebrow">
        🏆 VYRO CHALLENGES
      </div>

      <h1>
        Compete. Create. Win.
      </h1>

      <p>
        Show your skills, compete with talented people
        and get discovered worldwide.
      </p>


      <div class="hero-actions">

        <button
          class="primary"
          id="createChallengeBtn"
        >
          + Create Challenge
        </button>

        <button
          class="tool"
          id="backHomeChallenge"
        >
          Home
        </button>

      </div>

    </div>


    <h2>
      Open Challenges
    </h2>


    <div class="challenge-list">

      ${
        (data || []).length

          ? data.map(challengeCard).join('')

          : `

            <div class="card">

              <div class="post-body">

                <h3>
                  No challenges yet.
                </h3>

                <p class="meta">
                  Be the first person to create
                  a VYRO Challenge.
                </p>

              </div>

            </div>

          `
      }

    </div>

  `);


  document.getElementById('createChallengeBtn')
    ?.addEventListener(
      'click',
      createChallengePage
    );


  document.getElementById('backHomeChallenge')
    ?.addEventListener(
      'click',
      () => {

        state.page = 'home';
        render();

      }
    );


  document.querySelectorAll('[data-challenge]')
    .forEach(btn => {

      btn.onclick =
        () => viewChallenge(
          btn.dataset.challenge
        );

    });

}


function challengeCard(challenge) {

  const deadline =
    challenge.deadline
      ? new Date(
          challenge.deadline
        ).toLocaleString()
      : 'No deadline';


  return `

    <article class="card">

      <div class="post-body">

        <span class="tag">
          🏆 ${esc(
            challenge.category ||
            'Challenge'
          )}
        </span>


        <h2>
          ${esc(challenge.title)}
        </h2>


        <p>

          ${esc(
            challenge.description.slice(
              0,
              180
            )
          )}

          ${
            challenge.description.length > 180
              ? '...'
              : ''
          }

        </p>


        <div class="stats">

          <div class="stat">

            <b>
              ${money(
                challenge.prize,
                'USD'
              )}
            </b>

            <small>
              Prize
            </small>

          </div>


          <div class="stat">

            <b>
              ${esc(
                challenge.status
              )}
            </b>

            <small>
              Status
            </small>

          </div>

        </div>


        <p class="meta">
          ⏰ ${esc(deadline)}
        </p>


        <button
          class="primary"
          data-challenge="${challenge.id}"
        >
          View Challenge
        </button>

      </div>

    </article>

  `;
}


/* =========================
   CREATE CHALLENGE
========================= */

function createChallengePage() {

  shell(`

    <div class="card">

      <div class="post-body">

        <span class="tag">
          🏆 CREATE CHALLENGE
        </span>


        <h1>
          Create a VYRO Challenge
        </h1>


        <p class="meta">
          Give talented people a chance to compete
          and win a real prize.
        </p>


        <input
          id="challengeTitle"
          maxlength="150"
          placeholder="Challenge title"
        />


        <textarea
          id="challengeDescription"
          maxlength="5000"
          placeholder="Describe the challenge clearly..."
        ></textarea>


        <input
          id="challengeCategory"
          maxlength="80"
          placeholder="Category e.g. Logo Design"
        />


        <input
          id="challengePrize"
          type="number"
          min="0"
          step="0.01"
          placeholder="Prize in USD e.g. 100"
        />


        <label class="meta">
          Deadline
        </label>


        <input
          id="challengeDeadline"
          type="datetime-local"
        />


        <button
          class="primary"
          id="publishChallenge"
        >
          Publish Challenge 🏆
        </button>


        <button
          class="tool"
          id="cancelChallenge"
        >
          Cancel
        </button>


        <p
          id="challengeMessage"
          class="meta"
        ></p>

      </div>

    </div>

  `);


  document.getElementById('publishChallenge')
    .onclick =
      publishChallenge;


  document.getElementById('cancelChallenge')
    .onclick =
      () => {

        state.page = 'challenges';
        render();

      };

}


/* =========================
   PUBLISH CHALLENGE
========================= */

async function publishChallenge() {

  const user = await getUser();


  const title =
    document.getElementById('challengeTitle')
      .value
      .trim();


  const description =
    document.getElementById('challengeDescription')
      .value
      .trim();


  const category =
    document.getElementById('challengeCategory')
      .value
      .trim();


  const prize =
    Number(
      document.getElementById('challengePrize')
        .value || 0
    );


  const deadlineValue =
    document.getElementById('challengeDeadline')
      .value;


  const message =
    document.getElementById('challengeMessage');


  if (
    !title ||
    !description ||
    !category ||
    !deadlineValue
  ) {

    message.textContent =
      'Please complete all fields.';

    return;

  }


  const deadline =
    new Date(
      deadlineValue
    ).toISOString();


  if (
    new Date(deadline) <= new Date()
  ) {

    message.textContent =
      'Deadline must be in the future.';

    return;

  }


  const { error } =
    await supabase
      .from('challenges')
      .insert({
        creator_id: user.id,
        title,
        description,
        category,
        prize,
        deadline,
        status: 'open'
      });


  if (error) {

    message.textContent =
      error.message;

    return;

  }


  message.textContent =
    'Challenge published successfully! 🏆';


  setTimeout(() => {

    state.page = 'challenges';
    render();

  }, 1000);

}


/* =========================
   VIEW CHALLENGE
========================= */

async function viewChallenge(challengeId) {

  const {
    data: challenge,
    error
  } =
    await supabase
      .from('challenges')
      .select('*')
      .eq('id', challengeId)
      .single();


  if (error) {

    alert(error.message);
    return;

  }


  const {
    data: entries,
    error: entriesError
  } =
    await supabase
      .from('challenge_entries')
      .select('*')
      .eq(
        'challenge_id',
        challengeId
      )
      .order('created_at', {
        ascending: false
      });


  if (entriesError) {

    alert(entriesError.message);
    return;

  }


  const user =
    await getUser();


  const isCreator =
    user?.id === challenge.creator_id;


  const alreadySubmitted =
    (entries || []).some(
      entry =>
        entry.freelancer_id === user?.id
    );


  const deadline =
    challenge.deadline
      ? new Date(
          challenge.deadline
        ).toLocaleString()
      : 'No deadline';


  shell(`

    <div class="card">

      <div class="post-body">

        <span class="tag">
          🏆 ${esc(
            challenge.category
          )}
        </span>


        <h1>
          ${esc(
            challenge.title
          )}
        </h1>


        <p>
          ${esc(
            challenge.description
          )}
        </p>


        <div class="stats">

          <div class="stat">

            <b>
              ${money(
                challenge.prize,
                'USD'
              )}
            </b>

            <small>
              Prize
            </small>

          </div>


          <div class="stat">

            <b>
              ${esc(
                challenge.status
              )}
            </b>

            <small>
              Status
            </small>

          </div>

        </div>


        <p class="meta">
          ⏰ Deadline:
          ${esc(deadline)}
        </p>


        ${
          challenge.status === 'open' &&
          !isCreator &&
          !alreadySubmitted

            ? `

              <button
                class="primary"
                id="joinChallenge"
              >
                Join Challenge 🚀
              </button>

            `

            : ''
        }


        ${
          alreadySubmitted

            ? `

              <div class="card">
                <div class="post-body">

                  <h3>
                    ✅ You already submitted
                  </h3>

                  <p class="meta">
                    Your entry has been submitted
                    successfully.
                  </p>

                </div>
              </div>

            `

            : ''
        }


        ${
          isCreator

            ? `

              <div class="card">
                <div class="post-body">

                  <span class="tag">
                    CREATOR
                  </span>

                  <p class="meta">
                    You created this challenge.
                    Review submissions below.
                  </p>

                </div>
              </div>

            `

            : ''
        }

      </div>

    </div>


    <h2>
      🏆 Entries
    </h2>


    <div class="challenge-list">

      ${
        (entries || []).length

          ? entries.map(
              entry =>
                entryCard(
                  entry,
                  isCreator
                )
            ).join('')

          : `

            <div class="card">

              <div class="post-body">

                <h3>
                  No entries yet.
                </h3>

                <p class="meta">
                  Be the first to join this challenge.
                </p>

              </div>

            </div>

          `
      }

    </div>


    <button
      class="tool"
      id="backChallenges"
    >
      ← Back to Challenges
    </button>

  `);


  document.getElementById('joinChallenge')
    ?.addEventListener(
      'click',
      () => submitEntryPage(challenge)
    );


  document.getElementById('backChallenges')
    ?.addEventListener(
      'click',
      () => {

        state.page = 'challenges';
        render();

      }
    );

}


function entryCard(entry, isCreator) {

  return `

    <article class="card">

      <div class="post-body">

        <span class="tag">
          🚀 ENTRY
        </span>


        <h3>
          ${esc(entry.title)}
        </h3>


        <p>
          ${esc(
            entry.description ||
            'No description provided.'
          )}
        </p>


        ${
          entry.submission_url

            ? `

              <p>
                <a
                  href="${esc(
                    entry.submission_url
                  )}"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  🔗 View Submission
                </a>
              </p>

            `

            : ''
        }


        ${
          isCreator

            ? `

              <button
                class="primary"
                data-winner="${entry.id}"
              >
                🥇 Select Winner
              </button>

            `

            : ''
        }

      </div>

    </article>

  `;

}


/* =========================
   SUBMIT ENTRY
========================= */

function submitEntryPage(challenge) {

  shell(`

    <div class="card">

      <div class="post-body">

        <span class="tag">
          🚀 JOIN CHALLENGE
        </span>


        <h1>
          ${esc(
            challenge.title
          )}
        </h1>


        <p class="meta">
          Show the client what you can do.
        </p>


        <input
          id="entryTitle"
          maxlength="150"
          placeholder="Entry title"
        />


        <textarea
          id="entryDescription"
          maxlength="3000"
          placeholder="Explain your submission..."
        ></textarea>


        <input
          id="entryUrl"
          type="url"
          placeholder="Submission link e.g. Google Drive, portfolio..."
        />


        <button
          class="primary"
          id="sendEntry"
        >
          Submit Entry 🚀
        </button>


        <button
          class="tool"
          id="cancelEntry"
        >
          Cancel
        </button>


        <p
          id="entryMessage"
          class="meta"
        ></p>

      </div>

    </div>

  `);


  document.getElementById('sendEntry')
    .onclick =
      () => publishEntry(challenge);


  document.getElementById('cancelEntry')
    .onclick =
      () => viewChallenge(challenge.id);

}


/* =========================
   PUBLISH ENTRY
========================= */

async function publishEntry(challenge) {

  const user = await getUser();


  const title =
    document.getElementById('entryTitle')
      .value
      .trim();


  const description =
    document.getElementById('entryDescription')
      .value
      .trim();


  const submission_url =
    document.getElementById('entryUrl')
      .value
      .trim();


  const message =
    document.getElementById('entryMessage');


  if (!title || !description) {

    message.textContent =
      'Please enter your entry title and description.';

    return;

  }


  const { error } =
    await supabase
      .from('challenge_entries')
      .insert({
        challenge_id: challenge.id,
        freelancer_id: user.id,
        title,
        description,
        submission_url:
          submission_url || null
      });


  if (error) {

    message.textContent =
      error.message;

    return;

  }


  message.textContent =
    'Entry submitted successfully! 🚀';


  setTimeout(() => {

    viewChallenge(challenge.id);

  }, 1000);

}


/* =========================
   PROFILE
========================= */

async function profile() {
  const p = await ensureMarketplaceProfile();

  shell(`
    <div class="profile-cover">
      <div class="profile-avatar">
        ${esc((p?.username || 'V')[0]).toUpperCase()}
      </div>
    </div>

    <div class="profile-info">
      <h1>${esc(p?.display_name || p?.username || 'VYRO User')}</h1>

      <p class="meta">
        @${esc(p?.username || 'user')}
        · ${p?.role === 'freelancer' ? 'Freelancer' : 'Client'}
      </p>

      <p>
        ${esc(
          p?.bio ||
          'Welcome to VYRO Marketplace. Build your profile and connect with the world.'
        )}
      </p>
    </div>

    <div class="stats">
      <div class="stat">
        <b>${esc(p?.country || '🌍')}</b>
        <small>Country</small>
      </div>

      <div class="stat">
        <b>${p?.is_verified ? '✓' : '—'}</b>
        <small>Verified</small>
      </div>

      <div class="stat">
        <b>$${Number(p?.hourly_rate || 0)}</b>
        <small>Hourly rate</small>
      </div>
    </div>

    <div class="card">
      <div class="post-body">

        <button class="primary" id="editProfileBtn">
          ✏️ Edit Profile
        </button>

        <button class="tool" id="profileChallenges">
          🏆 My Challenges
        </button>

        <button class="tool" id="switchRole">
          🔄 Switch Client / Freelancer
        </button>

        <button class="tool" id="logoutBtn">
          🚪 Log out
        </button>

      </div>
    </div>
  `);

  document.getElementById('editProfileBtn').onclick = () => {
    editProfilePage(p);
  };

  document.getElementById('profileChallenges').onclick = () => {
    state.page = 'challenges';
    render();
  };

  document.getElementById('switchRole').onclick = chooseRole;

  document.getElementById('logoutBtn').onclick = async () => {
    await supabase.auth.signOut();
  };
}


function editProfilePage(p) {
  shell(`
    <div class="page">

      <button class="tool" id="backProfile">
        ← Back to Profile
      </button>

      <div class="card">
        <div class="post-body">

          <span class="tag">PROFILE</span>

          <h1>Edit Profile</h1>

          <p class="meta">
            Make your VYRO profile look professional.
          </p>

          <label>Display Name</label>
          <input
            id="editDisplayName"
            type="text"
            maxlength="50"
            value="${esc(p?.display_name || '')}"
            placeholder="Your name"
          />

          <label>Username</label>
          <input
            type="text"
            value="@${esc(p?.username || '')}"
            disabled
          />

          <label>Bio</label>
          <textarea
            id="editBio"
            maxlength="300"
            placeholder="Tell people about yourself..."
          >${esc(p?.bio || '')}</textarea>

          <label>Country</label>
          <input
            id="editCountry"
            type="text"
            maxlength="50"
            value="${esc(p?.country || '')}"
            placeholder="e.g. Nigeria"
          />

          <label>Hourly Rate (USD)</label>
          <input
            id="editHourlyRate"
            type="number"
            min="0"
            step="1"
            value="${Number(p?.hourly_rate || 0)}"
            placeholder="10"
          />

          <button class="primary" id="saveProfileBtn">
            💾 Save Profile
          </button>

          <p id="profileSaveMessage" class="meta"></p>

        </div>
      </div>

    </div>
  `);

  document.getElementById('backProfile').onclick = () => {
    state.page = 'profile';
    render();
  };

  document.getElementById('saveProfileBtn').onclick = saveProfile;
}


async function saveProfile() {
  const user = (await supabase.auth.getUser()).data.user;

  if (!user) return;

  const display_name =
    document.getElementById('editDisplayName').value.trim();

  const bio =
    document.getElementById('editBio').value.trim();

  const country =
    document.getElementById('editCountry').value.trim();

  const hourly_rate =
    Number(document.getElementById('editHourlyRate').value || 0);

  const message =
    document.getElementById('profileSaveMessage');

  message.textContent = 'Saving...';

  const { data, error } = await supabase
    .from('marketplace_profiles')
    .update({
      display_name,
      bio,
      country,
      hourly_rate
    })
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    console.error(error);
    message.textContent =
      '❌ ' + (error.message || 'Could not save profile.');
    return;
  }

  state.profile = data;

  message.textContent = '✅ Profile updated successfully!';

  setTimeout(() => {
    state.page = 'profile';
    render();
  }, 700);
}

  const p =
    await ensureMarketplaceProfile();


  shell(`

    <div class="profile-cover">

      <div class="profile-avatar">

        ${esc(
          (p?.username || 'V')[0]
        ).toUpperCase()}

      </div>

    </div>


    <div class="profile-info">

      <h1>
        ${esc(
          p?.display_name ||
          p?.username ||
          'VYRO User'
        )}
      </h1>


      <p class="meta">

        @${esc(
          p?.username ||
          'user'
        )}

        ·

        ${
          p?.role === 'freelancer'
            ? 'Freelancer'
            : 'Client'
        }

      </p>


      <p>

        ${esc(
          p?.bio ||
          'Welcome to VYRO Marketplace. Build your profile and connect with the world.'
        )}

      </p>

    </div>


    <div class="stats">

      <div class="stat">

        <b>
          ${esc(
            p?.country ||
            '🌍'
          )}
        </b>

        <small>
          Country
        </small>

      </div>


      <div class="stat">

        <b>
          ${
            p?.is_verified
              ? '✓'
              : '—'
          }
        </b>

        <small>
          Verified
        </small>

      </div>


      <div class="stat">

        <b>
          ${p?.hourly_rate || 0}
        </b>

        <small>
          Hourly rate
        </small>

      </div>

    </div>


    ${
      p?.role === 'freelancer'

        ? `

          <div class="card">

            <div class="post-body">

              <span class="tag">
                FREELANCER
              </span>

              <h2>
                Build your professional profile
              </h2>

              <p class="meta">
                Add your skills, portfolio,
                country and hourly rate.
              </p>

            </div>

          </div>

        `

        : ''
    }


    <div class="card">

      <div class="post-body">

        <button
          class="primary"
          id="profileChallenges"
        >
          🏆 My Challenges
        </button>


        <button
          class="tool"
          id="switchRole"
        >
          Switch Client / Freelancer
        </button>


        <button
          class="tool"
          id="logoutBtn"
        >
          Log out
        </button>

      </div>

    </div>

  `);


  document.getElementById('profileChallenges')
    .onclick =
      () => {

        state.page = 'challenges';
        render();

      };


  document.getElementById('switchRole')
    .onclick =
      chooseRole;


  document.getElementById('logoutBtn')
    .onclick =
      () => supabase.auth.signOut();

}


/* =========================
   INBOX
========================= */

function inbox() {

  shell(`

    <div class="hero">

      <div class="eyebrow">
        💬 VYRO MESSAGES
      </div>

      <h1>
        Your conversations
      </h1>

      <p>
        Messaging will connect clients and freelancers here.
      </p>

    </div>


    <div class="card">

      <div class="post-body">

        <h3>
          Inbox is ready for the next phase 🚀
        </h3>

        <p class="meta">
          Real-time project messaging will be connected
          after jobs and proposals are working.
        </p>

      </div>

    </div>

  `);

}


/* =========================
   FREELANCERS
========================= */

function freelancers() {

  shell(`

    <div class="hero">

      <div class="eyebrow">
        👥 FIND TALENT
      </div>

      <h1>
        Find skilled freelancers.
      </h1>

      <p>
        Discover professionals who can help
        bring your project to life.
      </p>


      <input
        id="freelancerSearch"
        placeholder="Search designers, editors, developers..."
      />

    </div>


    <div class="card">

      <div class="post-body">

        <h2>
          Freelancer marketplace is coming 🚀
        </h2>

        <p class="meta">
          The next step will load real freelancer profiles,
          skills, ratings and portfolios from Supabase.
        </p>


        <button
          class="primary"
          id="becomeFreelancer"
        >
          Become a Freelancer
        </button>

      </div>

    </div>

  `);


  document.getElementById('becomeFreelancer')
    .onclick =
      () => saveRole('freelancer');

}


/* =========================
   RENDER
========================= */

async function render(search = '') {

  navLabels();


  document.querySelectorAll('.nav')
    .forEach(n =>

      n.classList.toggle(
        'active',
        n.dataset.page === state.page
      )

    );


  if (state.page === 'home')
    return home();


  if (state.page === 'profile')
    return profile();


  if (state.page === 'inbox')
    return inbox();


  if (state.page === 'challenges')
    return challenges();


  if (state.page === 'world') {

    if (state.role === 'freelancer') {

      return jobs(search);

    }

    return freelancers();

  }

}


/* =========================
   NAVIGATION
========================= */

function wireNavigation() {

  document.querySelectorAll('.nav')
    .forEach(n => {

      n.onclick = () => {

        state.page =
          n.dataset.page;

        render();

      };

    });

}


document.getElementById('createBtn').onclick =
  () => {

    if (state.role === 'client') {

      postJobPage();

    } else {

      state.page = 'world';
      render();

    }

  };


document.getElementById('closeModal').onclick =
  () =>
    document.getElementById('postModal')
      .classList
      .add('hidden');


/* =========================
   AUTH
========================= */

document.getElementById('loginTab').onclick =
  () =>
    setAuthMode('login');


document.getElementById('signupTab').onclick =
  () =>
    setAuthMode('signup');


document.getElementById('authForm').onsubmit =
  async e => {

    e.preventDefault();


    if (!supabase) {

      msg(
        'First connect VYRO to Supabase in config.js.'
      );

      return;

    }


    const email =
      document.getElementById('authEmail')
        .value
        .trim();


    const password =
      document.getElementById('authPassword')
        .value;


    if (authMode === 'login') {

      const { error } =
        await supabase.auth
          .signInWithPassword({
            email,
            password
          });


      if (error)
        msg(error.message);


    } else {

      const username =
        document.getElementById('authUsername')
          .value
          .trim()
          .toLowerCase();


      const { data, error } =
        await supabase.auth
          .signUp({
            email,
            password,
            options: {
              data: {
                username
              }
            }
          });


      if (error) {

        msg(error.message);

      } else if (data.session) {

        msg(
          'Account created!'
        );

      } else {

        msg(
          'Account created. Check your email to confirm, then log in.'
        );

      }

    }

  };


function setAuthMode(mode) {

  authMode = mode;


  document.getElementById('loginTab')
    .classList
    .toggle(
      'active',
      mode === 'login'
    );


  document.getElementById('signupTab')
    .classList
    .toggle(
      'active',
      mode === 'signup'
    );


  document.querySelector('.signup-only')
    .classList
    .toggle(
      'hidden',
      mode !== 'signup'
    );


  document.getElementById('authSubmit')
    .textContent =
      mode === 'login'
        ? 'Login'
        : 'Create account';


  msg('');

}


/* =========================
   BOOT
========================= */

async function boot() {

  wireNavigation();


  if (!configured) {

    authScreen.classList
      .remove('hidden');

    setAuthMode('login');


    msg(
      'VYRO is ready. Add your Supabase URL and anon key in config.js.'
    );


    return;

  }


  const {
    data: {
      session
    }
  } =
    await supabase.auth
      .getSession();


  supabase.auth.onAuthStateChange(
    (_event, s) => {

      if (s) {

        authScreen.classList
          .add('hidden');

        appShell.classList
          .remove('hidden');

        render();

      } else {

        appShell.classList
          .add('hidden');

        authScreen.classList
          .remove('hidden');

      }

    }
  );


  if (session) {

    authScreen.classList
      .add('hidden');

    appShell.classList
      .remove('hidden');


    await ensureMarketplaceProfile();

    await render();

  } else {

    authScreen.classList
      .remove('hidden');

    appShell.classList
      .add('hidden');

  }

}


boot();
