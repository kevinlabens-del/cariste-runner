
    (function(){
      try{
        var mm = window.matchMedia || function(){ return { matches:false }; };
        var standalone = mm('(display-mode: standalone)').matches || window.navigator.standalone === true;
        var coarse = mm('(pointer: coarse)').matches || (navigator.maxTouchPoints || 0) > 0;
        var phoneUA = /Android|iPhone|iPod|Windows Phone|Mobile/i.test(navigator.userAgent || '');
        var smallScreen = Math.min(screen.width || 0, screen.height || 0) <= 920;
        if ((coarse && (phoneUA || smallScreen)) || (standalone && coarse)) {
          document.documentElement.classList.add('cr-mobile-ui');
        }
        if (standalone) document.documentElement.classList.add('cr-standalone-ui');
      }catch(e){}
    })();
  