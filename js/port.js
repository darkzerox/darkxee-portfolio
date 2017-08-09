/**
 * getJSON portfolio
 * @method
 * @param  {json file} get data from json file
 * @return {callback}
 */
$.getJSON("/portfolio.json", function(data) {
  var port_data = [];
  var port_pop = [];
  $.each(data, function(key, field) {
    port_data.push(`
      <div class="col-sm-4 portfolio-item group-${field.cateogry}">
        <a href="#${field.name}" class="portfolio-link" data-toggle="modal" rel="noindex nofollow">
          <div class="caption">
            <div class="caption-content">
              <i class="fa fa-search-plus fa-3x"></i>
              <div class="port-pop-title"><h2>${field.name}</h2></div>
            </div>
          </div>
          <img src="img/portfolio/${field.img}" class="img-responsive alt="${field.name}">
        </a>
      </div>
    `);

    port_pop.push(`
      <div class="portfolio-modal modal fade" id="${field.name}" tabindex="-1" role="dialog" aria-hidden="true">
        <div class="modal-content">
          <div class="close-modal" data-dismiss="modal">
            <div class="lr">
              <div class="rl">
              </div>
            </div>
          </div>
          <div class="container">
            <div class="row">
              <div class="col-lg-8 col-lg-offset-2">
                <div class="modal-body">
                  <h2>${field.name}</h2>
                  <hr class="star-primary">
                  <img src="img/portfolio/${field.img}" class="img-responsive img-centered" alt="${field.name}">
                  <p>${field.desc}</p>
                  <ul class="list-inline item-details">
                    <li>Site:
                      <strong><a href="${field.site}" ref="noindex nofollow">${field.name}</a>
                                        </strong>
                    </li>
                    <li>Date:
                      <strong>${field.date}</strong>
                    </li>
                    <li>Site type:
                      <strong>${field.cateogry}</strong>
                    </li>
                  </ul>
                  <button type="button" class="btn btn-default" data-dismiss="modal"><i class="fa fa-times"></i> Close</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      `);
  });

  $(port_data.join("")).appendTo(".portfolio-list");
  $(port_pop.join("")).appendTo(".portfolio-pop");
});





var map;
/**
 * [initMap google map api]
 * @method initMap
 * @return {[type]} [description]
 */
function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: {
      lat: 13.7364836,
      lng: 100.5235114
    },
    zoom: 8,
    /**
     * [styles set map style]
     * @type {Array}
     */
    styles: [{
        "elementType": "geometry",
        "stylers": [{
          "color": "#315274"
        }]
      },
      {
        "elementType": "labels.text.fill",
        "stylers": [{
          "color": "#ffffff"
        }]
      },
      {
        "elementType": "labels.text.stroke",
        "stylers": [{
          "color": "#1a3646"
        }]
      },
      {
        "featureType": "administrative.country",
        "elementType": "geometry.stroke",
        "stylers": [{
          "color": "#315274"
        }]
      },
      {
        "featureType": "administrative.province",
        "elementType": "geometry.stroke",
        "stylers": [{
          "color": "#315274"
        }]
      },
      {
        "featureType": "landscape.natural",
        "elementType": "geometry",
        "stylers": [{
          "color": "#315274"
        }]
      },
      {
        "featureType": "poi",
        "elementType": "labels.text.fill",
        "stylers": [{
          "color": "#ffffff"
        }]
      },
      {
        "featureType": "poi.park",
        "elementType": "geometry.fill",
        "stylers": [{
          "color": "#315274"
        }]
      },
      {
        "featureType": "poi.park",
        "elementType": "labels.text.fill",
        "stylers": [{
          "color": "#ffffff"
        }]
      },
      {
        "featureType": "road",
        "elementType": "geometry",
        "stylers": [{
          "color": "#0f1923"
        }]
      },
      {
        "featureType": "road",
        "elementType": "labels.text.fill",
        "stylers": [{
          "color": "#ffffff"
        }]
      },
      {
        "featureType": "road.highway",
        "elementType": "geometry.stroke",
        "stylers": [{
          "color": "#0f1924"
        }]
      },
      {
        "featureType": "water",
        "elementType": "geometry",
        "stylers": [{
          "color": "#0f1924"
        }]
      },
      {
        "featureType": "water",
        "elementType": "labels.text.fill",
        "stylers": [{
          "color": "#ffffff"
        }]
      }
    ]
  });
}


$('.progress').each(function() {
  $(this).hover(
    function() {
      $(this).addClass('active');
    },
    function() {
      $(this).removeClass('active');
    }
  );
});
