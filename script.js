const hero = document.querySelector(".hero");
const portrait = document.querySelector(".portrait-stage");
const year = document.getElementById("year");

if (year) {
  year.textContent = new Date().getFullYear();
}

if (hero && portrait) {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let animationFrame = null;
  let resetTimer = null;
  let activePointer = null;
  let touchBounds = null;
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

  const followPointer = (event, bounds) => {
    clearTimeout(resetTimer);
    cursorX = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width) * 2 - 1));
    cursorY = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height) * 2 - 1));

    if (animationFrame === null) {
      animationFrame = requestAnimationFrame(updatePortrait);
    }
  };

  const resetPortrait = () => {
    clearTimeout(resetTimer);
    activePointer = null;
    touchBounds = null;
    cursorX = 0;
    cursorY = 0;
    if (animationFrame !== null) {
      cancelAnimationFrame(animationFrame);
    }
    updatePortrait();
  };

  portrait.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" || !event.isPrimary || reducedMotion.matches) return;
    activePointer = event.pointerId;
    // Keep touch coordinates local and stable while the portrait moves.
    touchBounds = portrait.getBoundingClientRect();
    portrait.setPointerCapture(event.pointerId);
    followPointer(event, touchBounds);
  }, { passive: true });

  hero.addEventListener("pointermove", (event) => {
    if (!event.isPrimary || reducedMotion.matches) return;
    if (event.pointerType === "mouse") {
      if (activePointer === null) followPointer(event, hero.getBoundingClientRect());
    } else if (event.pointerId === activePointer) {
      followPointer(event, touchBounds);
    }
  }, { passive: true });

  hero.addEventListener("pointerup", (event) => {
    if (event.pointerId !== activePointer) return;
    activePointer = null;
    touchBounds = null;
    // Let a quick tap show its reaction before returning to the neutral pose.
    resetTimer = setTimeout(resetPortrait, 900);
  }, { passive: true });

  hero.addEventListener("pointercancel", (event) => {
    if (event.pointerId === activePointer) resetPortrait();
  }, { passive: true });

  portrait.addEventListener("lostpointercapture", (event) => {
    if (event.pointerId === activePointer) resetPortrait();
  });

  hero.addEventListener("pointerleave", (event) => {
    if (event.pointerType === "mouse" && activePointer === null) resetPortrait();
  });

  reducedMotion.addEventListener("change", resetPortrait);
  window.addEventListener("blur", resetPortrait);
  window.addEventListener("resize", resetPortrait);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) resetPortrait();
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
  const dotNavigation = projectsCarousel.querySelector(".projects-carousel-dots");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  let activeIndex = 0;
  let heightFrame = null;
  let tiltFrame = null;
  let pointerPosition = null;
  let swipe = null;
  let suppressClickUntil = 0;

  const updateHeight = () => {
    heightFrame = null;
    const height = `${cards[activeIndex].offsetHeight}px`;
    if (track.style.getPropertyValue("--project-height") !== height) {
      track.style.setProperty("--project-height", height);
    }
  };

  const scheduleHeight = () => {
    if (heightFrame === null) heightFrame = requestAnimationFrame(updateHeight);
  };

  const resetTilt = () => {
    if (tiltFrame !== null) cancelAnimationFrame(tiltFrame);
    tiltFrame = null;
    pointerPosition = null;
    const card = cards[activeIndex];
    ["--tilt-x", "--tilt-y", "--glare-x", "--glare-y"].forEach((property) => {
      card.style.removeProperty(property);
    });
  };

  const showProject = (index) => {
    const nextIndex = ((index % cards.length) + cards.length) % cards.length;
    if (nextIndex !== activeIndex && cards[activeIndex].contains(document.activeElement)) {
      track.focus({ preventScroll: true });
    }
    resetTilt();
    activeIndex = nextIndex;

    cards.forEach((card, cardIndex) => {
      const active = cardIndex === activeIndex;
      const before = !active && cardIndex === (activeIndex - 1 + cards.length) % cards.length;
      const after = !active && !before && cardIndex === (activeIndex + 1) % cards.length;
      card.classList.toggle("is-active", active);
      card.classList.toggle("is-before", before);
      card.classList.toggle("is-after", after);
      card.classList.toggle("is-away", !active && !before && !after);
      card.inert = !active;
      card.setAttribute("aria-hidden", String(!active));
    });

    dots.forEach((dot, dotIndex) => {
      if (dotIndex === activeIndex) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });
    counter.textContent = `${String(activeIndex + 1).padStart(2, "0")} / ${String(cards.length).padStart(2, "0")}`;
    projectsCarousel.style.setProperty("--project-progress", (activeIndex + 1) / cards.length);
    const preview = cards[activeIndex].querySelector("img");
    if (preview) preview.loading = "eager";
    scheduleHeight();
  };

  const dots = cards.map((card, index) => {
    const title = card.querySelector("h3")?.textContent.trim() || `Project ${index + 1}`;
    card.id ||= `project-slide-${index + 1}`;
    card.setAttribute("role", "group");
    card.setAttribute("aria-roledescription", "slide");
    card.setAttribute("aria-label", `${index + 1} of ${cards.length}: ${title}`);
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "projects-carousel-dot";
    dot.setAttribute("aria-label", `Show project ${index + 1}: ${title}`);
    dot.setAttribute("aria-controls", card.id);
    dot.title = title;
    dot.addEventListener("click", () => showProject(index));
    dotNavigation?.append(dot);
    return dot;
  });

  projectsCarousel.classList.add("is-enhanced");
  track.scrollLeft = 0;
  previous.disabled = next.disabled = cards.length < 2;
  if (dotNavigation) dotNavigation.hidden = cards.length < 2;
  previous.addEventListener("click", () => showProject(activeIndex - 1));
  next.addEventListener("click", () => showProject(activeIndex + 1));

  track.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.target.closest("input, textarea, select, [contenteditable='true']")) return;
    const destinations = {
      ArrowLeft: activeIndex - 1,
      ArrowRight: activeIndex + 1,
      Home: 0,
      End: cards.length - 1,
    };
    if (!(event.key in destinations)) return;
    event.preventDefault();
    showProject(destinations[event.key]);
  });

  track.addEventListener("pointermove", (event) => {
    if (swipe && event.pointerId === swipe.pointerId) {
      const x = Math.abs(event.clientX - swipe.x);
      const y = Math.abs(event.clientY - swipe.y);
      if (y > 14 && y > x) swipe = null;
    }
    if (event.pointerType === "touch" || event.buttons || reducedMotion.matches || !finePointer.matches) return;
    pointerPosition = { x: event.clientX, y: event.clientY };
    if (tiltFrame !== null) return;
    tiltFrame = requestAnimationFrame(() => {
      tiltFrame = null;
      if (!pointerPosition) return;
      const bounds = track.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (pointerPosition.x - bounds.left) / bounds.width));
      const y = Math.max(0, Math.min(1, (pointerPosition.y - bounds.top) / bounds.height));
      const card = cards[activeIndex];
      card.style.setProperty("--tilt-x", `${(0.5 - y) * 5}deg`);
      card.style.setProperty("--tilt-y", `${(x - 0.5) * 6}deg`);
      card.style.setProperty("--glare-x", `${x * 100}%`);
      card.style.setProperty("--glare-y", `${y * 100}%`);
    });
  }, { passive: true });

  track.addEventListener("pointerleave", resetTilt);
  reducedMotion.addEventListener("change", resetTilt);
  finePointer.addEventListener("change", resetTilt);
  window.addEventListener("blur", () => {
    swipe = null;
    resetTilt();
  });

  track.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "touch" || !event.isPrimary) return;
    swipe = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
  }, { passive: true });

  track.addEventListener("pointerup", (event) => {
    if (!swipe || event.pointerId !== swipe.pointerId) return;
    const x = event.clientX - swipe.x;
    const y = event.clientY - swipe.y;
    swipe = null;
    const threshold = Math.max(45, Math.min(70, track.clientWidth * 0.12));
    if (Math.abs(x) < threshold || Math.abs(x) < Math.abs(y) * 1.35) return;
    suppressClickUntil = performance.now() + 400;
    showProject(activeIndex + (x < 0 ? 1 : -1));
  }, { passive: true });

  track.addEventListener("pointercancel", () => { swipe = null; }, { passive: true });
  track.addEventListener("click", (event) => {
    if (performance.now() >= suppressClickUntil) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    suppressClickUntil = 0;
  }, true);

  if ("ResizeObserver" in window) {
    const resizeObserver = new ResizeObserver(scheduleHeight);
    cards.forEach((card) => resizeObserver.observe(card));
  } else {
    window.addEventListener("resize", scheduleHeight);
    new MutationObserver(scheduleHeight).observe(track, {
      attributes: true,
      attributeFilter: ["hidden"],
      subtree: true,
    });
    track.querySelectorAll("img").forEach((image) => image.addEventListener("load", scheduleHeight));
  }

  showProject(0);
  updateHeight();
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
