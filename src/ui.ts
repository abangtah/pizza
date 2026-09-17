import { gsap } from 'gsap';
import lottie from 'lottie-web';
import type { DayConfig } from './calendar';
import { config, locale, state } from './calendar';

export class UIController {
  private sceneContainer = document.getElementById('piazza-container')!;
  private piazzaBg = document.querySelector('.piazza-bg')!;
  private hotspotsLayer = document.getElementById('hotspots-layer')!;
  private modal = document.getElementById('content-modal')!;
  private modalTitle = document.getElementById('modal-title')!;
  private modalText = document.getElementById('modal-text')!;
  private mediaContainer = document.getElementById('modal-media-container')!;
  private goDeeperBtn = document.getElementById('modal-go-deeper') as HTMLAnchorElement;
  private toast = document.getElementById('toast-notification')!;
  
  // Deeper View Elements
  private deeperView = document.getElementById('deeper-view')!;
  private deeperTitle = document.getElementById('deeper-title')!;
  private deeperScripture = document.getElementById('deeper-scripture')!;
  private deeperDevotional = document.getElementById('deeper-devotional')!;
  private btnBackText = document.getElementById('btn-back-text')!;
  
  private currentLottieInstance: any = null;
  private previouslyFocusedElement: HTMLElement | null = null;
  private focusableElements: HTMLElement[] = [];

  constructor() {
    this.bindEvents();
    this.renderHotspots();
    this.applyVisualStates();
    this.handleRouting(); // Check route on initial load
  }

  private bindEvents() {
    window.addEventListener('hashchange', () => this.handleRouting());
    
    document.getElementById('modal-close')?.addEventListener('click', () => this.closeModal());
    this.modal.querySelector('.modal-backdrop')?.addEventListener('click', () => this.closeModal());
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.modal.classList.contains('hidden')) {
        this.closeModal();
      }
      if (e.key === 'Tab' && !this.modal.classList.contains('hidden')) {
        this.trapFocus(e);
      }
    });
  }

  private applyVisualStates() {
    // We append the overlay divs dynamically for the CSS radial gradients to hit
    for(let i=1; i<=3; i++) {
      const overlay = document.createElement('div');
      overlay.className = `state-overlay overlay-${i}`;
      this.piazzaBg.appendChild(overlay);
    }

    config.days.forEach(day => {
      if (state.isUnlocked(day)) {
        this.piazzaBg.classList.add(day.stateUpdate);
      }
    });
  }

  private renderHotspots() {
    this.hotspotsLayer.innerHTML = '';
    
    config.days.forEach(dayConfig => {
      const btn = document.createElement('button');
      btn.className = 'hotspot';
      btn.style.left = `${dayConfig.hotspot.x}%`;
      btn.style.top = `${dayConfig.hotspot.y}%`;
      btn.innerText = dayConfig.day.toString();
      btn.setAttribute('aria-label', `Day ${dayConfig.day}`);
      
      const isUnlocked = state.isUnlocked(dayConfig);
      const isOpened = state.isOpened(dayConfig.day);
      
      if (isUnlocked) {
        btn.classList.add('unlocked');
        if (isOpened) btn.classList.add('opened');
        btn.addEventListener('click', () => this.openDay(dayConfig, btn));
      } else {
        btn.classList.add('locked');
        btn.setAttribute('aria-disabled', 'true');
        btn.addEventListener('click', () => this.showLockedToast(dayConfig));
      }
      
      this.hotspotsLayer.appendChild(btn);
    });
  }

  private showLockedToast(dayConfig: DayConfig) {
    const msg = locale.ui.lockedMessage.replace('{date}', dayConfig.day.toString());
    this.toast.innerText = msg;
    this.toast.classList.remove('hidden');
    
    gsap.fromTo(this.toast, 
      { y: 50, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.3, ease: 'power2.out' }
    );
    
    setTimeout(() => {
      gsap.to(this.toast, { 
        y: 50, opacity: 0, duration: 0.3, 
        onComplete: () => this.toast.classList.add('hidden') 
      });
    }, 3000);
  }

  private openDay(dayConfig: DayConfig, el: HTMLElement) {
    this.previouslyFocusedElement = document.activeElement as HTMLElement;
    
    state.markOpened(dayConfig.day);
    el.classList.add('opened');
    
    // Update the piazza visual state if opening adds a new layer
    this.piazzaBg.classList.add(dayConfig.stateUpdate);

    const contentData = locale.content[`day${dayConfig.day}`];
    
    this.modalTitle.innerText = contentData.title;
    this.modalText.innerText = contentData.text;
    
    if (dayConfig.hasGoDeeper && contentData.goDeeperUrl) {
      this.goDeeperBtn.href = contentData.goDeeperUrl;
      this.goDeeperBtn.target = "_blank"; // Open in new tab per requirements
      this.goDeeperBtn.innerText = locale.ui.goDeeperBtn;
      this.goDeeperBtn.classList.remove('hidden');
    } else {
      this.goDeeperBtn.classList.add('hidden');
    }

    this.loadMedia(dayConfig);

    // Open Modal
    this.modal.classList.remove('hidden');
    this.sceneContainer.classList.add('blur');
    const modalContent = this.modal.querySelector('.modal-content')!;
    
    gsap.fromTo(this.modal, { opacity: 0 }, { opacity: 1, duration: 0.4 });
    gsap.fromTo(modalContent, 
      { scale: 0.95, y: 20, opacity: 0 }, 
      { scale: 1, y: 0, opacity: 1, duration: 0.5, ease: "power3.out" }
    );

    // Update focusable elements array for trapFocus
    this.focusableElements = Array.from(this.modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'));
    if (this.focusableElements.length) {
      this.focusableElements[0].focus();
    }
  }

  private loadMedia(dayConfig: DayConfig) {
    this.mediaContainer.innerHTML = '';
    
    // Loading Shimmer
    const shimmer = document.createElement('div');
    shimmer.className = 'loading-shimmer';
    this.mediaContainer.appendChild(shimmer);

    if (dayConfig.contentType === 'lottie') {
      const container = document.createElement('div');
      container.style.width = '100%';
      container.style.height = '100%';
      this.mediaContainer.appendChild(container);

      // We are fetching the lottie json lazily here
      fetch(dayConfig.mediaPath)
        .then(res => res.json())
        .then(animationData => {
          shimmer.remove();
          this.currentLottieInstance = lottie.loadAnimation({
            container,
            renderer: 'svg',
            loop: true,
            autoplay: true,
            animationData
          });
        })
        .catch(err => {
          console.warn("Lottie failed to load, falling back to poster", err);
          this.fallbackToPoster(dayConfig.posterPath, shimmer);
        });
        
    } else if (dayConfig.contentType === 'video') {
      const vid = document.createElement('video');
      vid.controls = true;
      vid.autoplay = true;
      vid.loop = true;
      vid.muted = true; // Required for autoplay on most devices
      vid.playsInline = true;
      if(dayConfig.posterPath) vid.poster = dayConfig.posterPath;
      
      vid.addEventListener('loadeddata', () => {
        shimmer.remove();
        vid.classList.add('loaded');
      });
      
      vid.src = dayConfig.mediaPath;
      this.mediaContainer.appendChild(vid);
      
    } else if (dayConfig.contentType === 'static') {
      const img = document.createElement('img');
      img.alt = "";
      
      img.onload = () => {
        shimmer.remove();
        img.classList.add('loaded');
      };
      
      img.src = dayConfig.mediaPath;
      this.mediaContainer.appendChild(img);
    } else {
      shimmer.remove(); // e.g. purely reflection text
    }
  }

  private fallbackToPoster(posterPath: string | undefined, shimmer: HTMLElement) {
    if (!posterPath) {
      shimmer.remove();
      return;
    }
    const img = document.createElement('img');
    img.onload = () => {
      shimmer.remove();
      img.classList.add('loaded');
    };
    img.src = posterPath;
    this.mediaContainer.appendChild(img);
  }

  private closeModal() {
    const modalContent = this.modal.querySelector('.modal-content')!;
    
    this.sceneContainer.classList.remove('blur');

    gsap.to(modalContent, { 
      scale: 0.95, y: 15, opacity: 0, duration: 0.3, ease: "power2.in" 
    });
    
    gsap.to(this.modal, {
      opacity: 0, duration: 0.3, delay: 0.1,
      onComplete: () => {
        this.modal.classList.add('hidden');
        if (this.currentLottieInstance) {
          this.currentLottieInstance.destroy();
          this.currentLottieInstance = null;
        }
        this.mediaContainer.innerHTML = '';
        if (this.previouslyFocusedElement) {
          this.previouslyFocusedElement.focus();
        }
      }
    });
  }

  private trapFocus(e: KeyboardEvent) {
    if (!this.focusableElements.length) return;
    const first = this.focusableElements[0];
    const last = this.focusableElements[this.focusableElements.length - 1];
    
    if (e.shiftKey) {
      if (document.activeElement === first) {
        last.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    }
  }

  private handleRouting() {
    const hash = window.location.hash;
    if (hash.startsWith('#/deeper/')) {
      const dayStr = hash.replace('#/deeper/', '');
      const dayData = locale.content[`day${dayStr}`];
      
      if (dayData && dayData.deeperContent) {
        // Hide Piazza and Modal
        this.sceneContainer.style.display = 'none';
        this.modal.classList.add('hidden');
        
        // Populate Deeper View
        this.deeperTitle.innerText = dayData.deeperContent.title;
        this.deeperScripture.innerText = dayData.deeperContent.scripture;
        // Simple innerHTML for dev, in production you'd sanitize this if from CMS
        this.deeperDevotional.innerHTML = `<p>${dayData.deeperContent.devotional}</p>`;
        this.btnBackText.innerText = locale.ui.backToPiazzaBtn;
        
        // Setup Back Button
        document.querySelector('.btn-back')?.setAttribute('href', '#');
        
        // Show Deeper View
        this.deeperView.classList.remove('hidden');
        window.scrollTo(0, 0);
      }
    } else {
      // Show Piazza
      this.deeperView.classList.add('hidden');
      this.sceneContainer.style.display = 'flex';
    }
  }
}
