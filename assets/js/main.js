(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

  function motionBehaviour() {
    return reducedMotion.matches ? "auto" : "smooth";
  }

  /* ---------------------------------------------------------
     Header
     --------------------------------------------------------- */

  var header = document.querySelector("[data-header]");

  if (header) {
    var updateHeader = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 10);
    };
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
  }

  /* ---------------------------------------------------------
     Mobile navigation
     --------------------------------------------------------- */

  var navToggle = document.querySelector("[data-nav-toggle]");
  var nav = document.getElementById("primary-nav");

  if (navToggle && nav) {
    var closeNav = function (returnFocus) {
      nav.classList.remove("is-open");
      document.body.classList.remove("nav-open");
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.setAttribute("aria-label", "Open menu");
      if (returnFocus) navToggle.focus();
    };

    var openNav = function () {
      nav.classList.add("is-open");
      document.body.classList.add("nav-open");
      navToggle.setAttribute("aria-expanded", "true");
      navToggle.setAttribute("aria-label", "Close menu");
      var firstLink = nav.querySelector("a");
      if (firstLink) {
        window.setTimeout(function () {
          firstLink.focus();
        }, 60);
      }
    };

    navToggle.addEventListener("click", function () {
      if (navToggle.getAttribute("aria-expanded") === "true") {
        closeNav(false);
      } else {
        openNav();
      }
    });

    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) closeNav(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && nav.classList.contains("is-open")) {
        closeNav(true);
      }
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 960 && nav.classList.contains("is-open")) {
        closeNav(false);
      }
    });
  }

  /* ---------------------------------------------------------
     Reveal on scroll
     --------------------------------------------------------- */

  var reveals = document.querySelectorAll(".reveal");

  if (reveals.length) {
    if (!("IntersectionObserver" in window) || reducedMotion.matches) {
      reveals.forEach(function (element) {
        element.classList.add("is-visible");
      });
    } else {
      var revealObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          });
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
      );

      reveals.forEach(function (element) {
        revealObserver.observe(element);
      });
    }
  }

  /* ---------------------------------------------------------
     Hover glow on feature cards
     --------------------------------------------------------- */

  if (finePointer.matches) {
    document.querySelectorAll(".feature-card").forEach(function (card) {
      card.addEventListener("pointermove", function (event) {
        var rect = card.getBoundingClientRect();
        card.style.setProperty("--mx", (event.clientX - rect.left).toFixed(0) + "px");
        card.style.setProperty("--my", (event.clientY - rect.top).toFixed(0) + "px");
      });
    });
  }

  /* ---------------------------------------------------------
     Screenshot galleries
     --------------------------------------------------------- */

  function setupGallery(root) {
    var track = root.querySelector(".gallery-track");
    var slides = track ? Array.from(track.children) : [];
    var previous = root.querySelector("[data-gallery-prev]");
    var next = root.querySelector("[data-gallery-next]");
    var dotsWrap = root.querySelector("[data-gallery-dots]");

    if (!track || slides.length === 0) return;

    var dots = [];
    var targets = [];
    var frame = 0;

    function gap() {
      return parseFloat(window.getComputedStyle(track).columnGap) || 22;
    }

    function step() {
      return slides[0].getBoundingClientRect().width + gap();
    }

    function maxScroll() {
      return Math.max(0, track.scrollWidth - track.clientWidth);
    }

    function pageCount() {
      var maximum = maxScroll();
      if (maximum <= 4) return 1;
      return Math.ceil(maximum / step()) + 1;
    }

    function buildTargets() {
      var count = pageCount();
      var maximum = maxScroll();
      targets = [];
      for (var index = 0; index < count; index += 1) {
        targets.push(index === count - 1 ? maximum : Math.min(index * step(), maximum));
      }
      return count;
    }

    function activeIndex() {
      var best = 0;
      var bestDistance = Infinity;
      targets.forEach(function (target, index) {
        var distance = Math.abs(track.scrollLeft - target);
        if (distance <= bestDistance) {
          best = index;
          bestDistance = distance;
        }
      });
      return best;
    }

    function update() {
      frame = 0;
      var maximum = maxScroll();

      if (previous) previous.disabled = track.scrollLeft <= 4;
      if (next) next.disabled = track.scrollLeft >= maximum - 4;

      var count = buildTargets();
      if (dots.length !== count) buildDots(count);
      if (dotsWrap) dotsWrap.hidden = count < 2;

      var active = activeIndex();
      dots.forEach(function (dot, index) {
        if (index === active) {
          dot.setAttribute("aria-current", "true");
        } else {
          dot.removeAttribute("aria-current");
        }
      });
    }

    function requestUpdate() {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    }

    function goTo(left) {
      track.scrollTo({ left: Math.min(left, maxScroll()), behavior: motionBehaviour() });
    }

    function buildDots(count) {
      if (!dotsWrap) return;
      dotsWrap.textContent = "";
      dots = [];
      for (var index = 0; index < count; index += 1) {
        var dot = document.createElement("button");
        dot.className = "gallery-dot";
        dot.type = "button";
        dot.setAttribute("aria-label", "Go to position " + (index + 1) + " of " + count);
        dot.addEventListener(
          "click",
          (function (position) {
            return function () {
              goTo(targets[position]);
            };
          })(index)
        );
        dotsWrap.appendChild(dot);
        dots.push(dot);
      }
    }

    if (previous) {
      previous.addEventListener("click", function () {
        track.scrollBy({ left: -step(), behavior: motionBehaviour() });
      });
    }

    if (next) {
      next.addEventListener("click", function () {
        track.scrollBy({ left: step(), behavior: motionBehaviour() });
      });
    }

    track.addEventListener("scroll", requestUpdate, { passive: true });
    track.addEventListener("keydown", function (event) {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        track.scrollBy({ left: step(), behavior: motionBehaviour() });
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        track.scrollBy({ left: -step(), behavior: motionBehaviour() });
      }
    });

    window.addEventListener("resize", requestUpdate);
    update();
  }

  document.querySelectorAll("[data-gallery]").forEach(setupGallery);

  /* ---------------------------------------------------------
     Footer year
     --------------------------------------------------------- */

  document.querySelectorAll("[data-year]").forEach(function (element) {
    element.textContent = String(new Date().getFullYear());
  });
})();
