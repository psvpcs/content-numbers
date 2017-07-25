``` // ==UserScript==
// @name        Housenumbers
// @namespace   viaplay.com
// @include     /^https?://(.*\.)?viaplay.(se|no|dk|fi)\//
// @version     1.6
// @grant       none
// ==/UserScript==
let seasonObserver = undefined;
let sportScheduleObserver = undefined;
function get_housenumber(element) {
  if(element.hasAttribute(‘data-product-id’)) {
    return element.getAttribute(‘data-product-id’);
  }
  if (element.hasAttribute(‘data-stream-url’)) {
    return element.getAttribute(‘data-stream-url’).match(/guid=([^&]+)/)[1];
  }
  if (element.hasAttribute(‘src’)) {
    return element.getAttribute(‘src’).match(/https?:\/\/.*\/([^_]+).*/)[1];
  }
  return null;
}
function add_housenumber(item, housenumber, extra_styles = {}) {
  const label = document.createElement(‘div’);
  label.style.color = ‘silver’;
  label.style.position = ‘absolute’;
  label.style.backgroundColor = ‘black’;
  label.style.fontSize = ‘10pt’;
  label.style.cursor = ‘auto’;
  label.style.top = 0;
  label.style.right = 0;
  label.style.paddingLeft = ‘0.5em’;
  label.style.paddingRight = ‘0.5em’;
  label.style.zIndex = 9;
  label.style.display = ‘inline-block’;
  label.appendChild(document.createTextNode(housenumber));
  label.addEventListener(‘click’, function(e) { e.stopPropagation(); }, false);
  for (const key in extra_styles) {
    if (extra_styles[key] === null) {
      label.style.removeProperty(key);
    } else {
      label.style.setProperty(key, extra_styles[key]);
    }
  }
  item.appendChild(label);
  item.classList.add(‘housenumbered’);
}
const add_housenumbers_to_series_episodes = debounce(function(seasonSection) {
  const episodes = seasonSection.querySelectorAll(‘div.episode:not(.housenumbered)‘);
  Array.prototype.forEach.call(episodes, function(item) {
    const housenumber = get_housenumber(item);
    if(housenumber !== null) {
      add_housenumber(item, housenumber);
    }
  });
  if(episodes.length > 0) {
    seasonSection.classList.add(‘housenumbered’);
  }
}, 500);
function add_housenumber_to_search_result(searchResult) {
  const searchResultItems = searchResult.querySelectorAll(‘div.result > div:not(.housenumbered)‘);
  Array.prototype.forEach.call(searchResultItems, function(item) {
    const housenumber = get_housenumber(item);
    add_housenumber(item, housenumber);
  });
}
function add_housenumbers_to_collection(collectionSection) {
  const products = collectionSection.querySelectorAll(‘[data-product-id]‘);
  Array.prototype.forEach.call(products, function (item) {
    if(!item.classList.contains(‘housenumbered’)) {
      const housenumber = get_housenumber(item);
      add_housenumber(item, housenumber);
    }
  });
  if(products.length > 0) {
    collectionSection.classList.add(‘housenumbered’);
  }
}
function add_housenumbers_product_page(productSection) {
  let housenumber;
  // PlayLink This only works on EST and rentals
  const playLink = productSection.querySelector(‘[data-product-id]‘);
  if (playLink !== null) {
    housenumber = get_housenumber(playLink);
  } else {
    // Get the house number of the first product in the content service response
    // This does not work for sport series product pages, hence the try catch block
    try {
      housenumber = window.viaplay.contentResponse._embedded[‘viaplay:blocks’][0]._embedded[‘viaplay:product’].system.guid;
    } catch (e) {
      return; // nom nom
    }
  }
  const thumbnail = productSection.querySelector(‘div.thumb’);
  add_housenumber(thumbnail, housenumber, { ‘font-size’: ‘20pt’, ‘line-height’: ‘1.4em’, ‘top’: ‘’, ‘right’: ‘’});
  productSection.classList.add(‘housenumbered’);
}
function add_housenumbers_featurebox(featureboxSection) {
  const items = featureboxSection.querySelectorAll(‘ul.frames li:not(.housenumbered)‘);
  Array.prototype.forEach.call(items, function(item){
    const playButton = item.querySelector(‘a.play-btn’);
    if (playButton === null) {
      item.classList.add(‘housenumbered’);
      return;
    }
    const housenumber = get_housenumber(playButton);
    add_housenumber(item, housenumber, { ‘font-size’: ‘20pt’, ‘line-height’: ‘1.4em’ });
  })
}
const add_housenumbers_sports_per_day = debounce(function(sportSection) {
  Array.prototype.forEach.call(sportSection.querySelectorAll(‘li.sport-event’), function(item) {
    if (!item.classList.contains(‘housenumbered’)) {
      const housenumber = item.getAttribute(‘data-product-id’);
      add_housenumber(item, housenumber, { right: ‘0px’, bottom: ‘0px’, left: null, top: null });
    }
  });
  sportSection.classList.add(‘housenumbered’);
}, 500);
function setup_numbering_season(seasonSection) {
  if(seasonObserver !== undefined) {
    seasonObserver.disconnect();
  }
  add_housenumbers_to_series_episodes(seasonSection);
  seasonObserver = getObserver(() => add_housenumbers_to_series_episodes(seasonSection), seasonSection);
}
function setup_numbering_sports_per_day(sportSection) {
  if(sportScheduleObserver!== undefined) {
    sportScheduleObserver.disconnect();
  }
  add_housenumbers_sports_per_day(sportSection);
  sportScheduleObserver = getObserver(() => add_housenumbers_sports_per_day(sportSection), sportSection);
}
const setup_numbering = debounce(function() {
  // Products in blocks
  // Start section, series section, kids section, sport section
  const collectionSections = document.querySelectorAll(‘section.collection’);
  if (collectionSections.length > 0) {
    Array.prototype.forEach.call(collectionSections, add_housenumbers_to_collection);
  }
  // Episodes in series
  // Series season, Kids series season
  const seasonSections = document.querySelectorAll(‘section div.collection.episode:not(.housenumbered)‘);
  if (seasonSections.length > 0) {
    Array.prototype.forEach.call(seasonSections, setup_numbering_season);
  }
  // Movie page, kids movie, Sport event page
  const productSections = document.querySelectorAll(‘section.product:not(.housenumbered)‘);
  if (productSections.length > 0) {
    Array.prototype.forEach.call(productSections, add_housenumbers_product_page);
  }
  // Feature box
  const featureBoxSections = document.querySelectorAll(‘section.featurebox’);
  if (featureBoxSections.length > 0) {
    Array.prototype.forEach.call(featureBoxSections, add_housenumbers_featurebox);
  }
  // Search result
  const searchResult = document.querySelector(‘div.search-result div.result’);
  if(searchResult !== null) {
    add_housenumber_to_search_result(searchResult);
  }
  // Sport schedule
  const sportSection = document.querySelector(‘section[data-viaplay-module-id=SportSchedule]:not(.housenumbered)‘);
  if (sportSection !== null) {
    setup_numbering_sports_per_day(sportSection);
  }
}, 500);
// Returns a function, that, as long as it continues to be invoked, will not
// be triggered. The function will be called after it stops being called for
// N milliseconds. If `immediate` is passed, trigger the function on the
// leading edge, instead of the trailing.
// from underscore.js
function debounce(func, wait) {
  let timeout;
  return function() {
    const context = this;
    const args = arguments;
    const later = function() {
      timeout = null;
      func.apply(context, args);
    };
    const callNow = !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) {
      func.apply(context, args);
    }
  };
}
function getObserver(fn, elementToObserv) {
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(fn);
  });
  // https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver#MutationObserverInit
  observer.observe(elementToObserv, {childList: true, subtree: true, characterData: true, attributes: false});
  return observer;
}
setup_numbering();
getObserver(() => setup_numbering(), document.getElementsByTagName(‘body’)[0]);
```
