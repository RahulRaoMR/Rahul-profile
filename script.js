const hero = document.querySelector(".hero");
const portrait = document.querySelector(".portrait-stage");
const year = document.getElementById("year");

if (year) {
  year.textContent = new Date().getFullYear();
}

if (hero && portrait) {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let animationFrame = null;
  let cursorX = 0;
  let cursorY = 0;

  const updatePortrait = () => {
    hero.style.setProperty("--move-x", `${cursorX * 17}px`);
    hero.style.setProperty("--move-y", `${cursorY * 10}px`);
    hero.style.setProperty("--turn-y", `${cursorX * 4}deg`);
    hero.style.setProperty("--turn-x", `${cursorY * -2}deg`);
    portrait.dataset.gaze = cursorY > 0.25 ? "down" : cursorX < -0.27 ? "left" : cursorX > 0.27 ? "right" : "center";
    animationFrame = null;
  };

  hero.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch" || reducedMotion.matches) {
      return;
    }

    const bounds = hero.getBoundingClientRect();
    cursorX = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width) * 2 - 1));
    cursorY = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height) * 2 - 1));

    if (animationFrame === null) {
      animationFrame = requestAnimationFrame(updatePortrait);
    }
  });

  hero.addEventListener("pointerleave", () => {
    cursorX = 0;
    cursorY = 0;
    if (animationFrame !== null) {
      cancelAnimationFrame(animationFrame);
    }
    updatePortrait();
  });
}

const animatedCharacter = document.querySelector("[data-character-animation]");

if (animatedCharacter) {
  const toggle = animatedCharacter.querySelector("[data-motion-toggle]");
  const frames = [...animatedCharacter.querySelectorAll(".projects-character-frame")];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let inView = false;
  let userPaused = false;
  let framesReady = false;
  let loadingFrames = false;

  const updateMotion = () => {
    animatedCharacter.classList.toggle("is-playing", framesReady && !reducedMotion.matches);
    animatedCharacter.classList.toggle("is-paused", userPaused || !inView || document.hidden);
    toggle.hidden = !framesReady || reducedMotion.matches;
    toggle.textContent = userPaused ? "Play animation" : "Pause animation";
  };

  const restartMotion = () => {
    if (!framesReady || reducedMotion.matches || userPaused || !inView || document.hidden) return;
    frames.forEach((frame) => {
      frame.getAnimations().forEach((animation) => { animation.currentTime = 0; });
    });
  };

  const prepareFrames = () => {
    if (loadingFrames) return;
    loadingFrames = true;
    Promise.all(frames.map((frame) => {
      frame.loading = "eager";
      return frame.decode().catch(() => null);
    })).then(() => {
      framesReady = frames.every((frame) => frame.naturalWidth > 0);
      updateMotion();
      restartMotion();
    });
  };

  toggle.addEventListener("click", () => {
    userPaused = !userPaused;
    updateMotion();
  });

  reducedMotion.addEventListener("change", () => {
    if (!reducedMotion.matches && inView) prepareFrames();
    updateMotion();
    restartMotion();
  });
  document.addEventListener("visibilitychange", () => {
    updateMotion();
    restartMotion();
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      const wasInView = inView;
      inView = entry.isIntersecting;
      if (inView && !reducedMotion.matches) prepareFrames();
      updateMotion();
      if (inView && !wasInView) restartMotion();
    }, { threshold: 0.1 }).observe(animatedCharacter);
  } else {
    inView = true;
    if (!reducedMotion.matches) prepareFrames();
  }

  updateMotion();
}

const projectsCarousel = document.querySelector(".projects-carousel");

if (projectsCarousel) {
  const track = projectsCarousel.querySelector(".projects-grid");
  const cards = [...track.querySelectorAll(".project-card")];
  const counter = projectsCarousel.querySelector(".projects-carousel-count");
  const previous = projectsCarousel.querySelector("[data-project-prev]");
  const next = projectsCarousel.querySelector("[data-project-next]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let activeIndex = 0;
  let scrollFrame = null;
  let targetIndex = null;

  const updatePosition = (index) => {
    activeIndex = Math.max(0, Math.min(cards.length - 1, index));
    counter.textContent = `${String(activeIndex + 1).padStart(2, "0")} / ${String(cards.length).padStart(2, "0")}`;
    projectsCarousel.style.setProperty("--project-progress", (activeIndex + 1) / cards.length);
  };

  const showProject = (index) => {
    const nextIndex = (index + cards.length) % cards.length;
    const wrapsAround = Math.abs(nextIndex - activeIndex) > 1;
    targetIndex = nextIndex;
    updatePosition(nextIndex);
    track.scrollTo({
      left: nextIndex * track.clientWidth,
      behavior: reducedMotion.matches || wrapsAround ? "instant" : "smooth",
    });
  };

  previous.addEventListener("click", () => showProject(activeIndex - 1));
  next.addEventListener("click", () => showProject(activeIndex + 1));

  track.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    showProject(activeIndex + (event.key === "ArrowRight" ? 1 : -1));
  });

  track.addEventListener("scroll", () => {
    if (scrollFrame !== null) return;
    scrollFrame = requestAnimationFrame(() => {
      if (targetIndex !== null) {
        if (Math.abs(track.scrollLeft - targetIndex * track.clientWidth) < 2) {
          targetIndex = null;
        } else {
          scrollFrame = null;
          return;
        }
      }
      updatePosition(Math.round(track.scrollLeft / track.clientWidth));
      scrollFrame = null;
    });
  }, { passive: true });

  track.addEventListener("pointerdown", () => { targetIndex = null; });
  track.addEventListener("wheel", () => { targetIndex = null; }, { passive: true });

  if ("ResizeObserver" in window) {
    new ResizeObserver(() => {
      track.scrollTo({ left: activeIndex * track.clientWidth, behavior: "instant" });
    }).observe(track);
  }

  updatePosition(0);
}

document.querySelectorAll("[data-details]").forEach((button) => {
  const panel = document.getElementById(button.dataset.details);
  if (!panel) return;

  button.addEventListener("click", () => {
    const isExpanded = button.getAttribute("aria-expanded") === "true";
    button.setAttribute("aria-expanded", String(!isExpanded));
    button.querySelector(".details-label").textContent = isExpanded ? "View Details" : "Hide Details";
    button.querySelector("[aria-hidden]").textContent = isExpanded ? "+" : "−";
    panel.hidden = isExpanded;
  });
});
