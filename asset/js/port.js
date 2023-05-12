$(window).load(function () {
	$(".box").each(function () {
		var p_bar = $(this).find(".progress-bar");
		$(this).hover(
			function () {
				p_bar.addClass("active");
			},
			function () {
				p_bar.removeClass("active");
			}
		);
	});
	$(".progress-bar").each(function () {
		$(this).animate({
			width: $(this).attr("aria-valuenow") + "%",
		});
	});
});

/**
 * portfolio data from json
 * @method
 * @param  {string} data get url path
 * @return {string}  return and appendTo div
 */
$.getJSON("/asset/database/portfolio.json", function (data) {
	var port_data = [];
	var port_pop = [];
	$.each(data.reverse(), function (key, field) {
		port_data.push(`
      <div class="col-sm-4 gallery_product portfolio-item filter group-${field.cateogry} ${field.cateogry} ">
        <a href="#${field.name}" class="portfolio-link" data-toggle="modal" rel="noindex nofollow">
          <div class="caption">
            <div class="caption-content">
              <i class="fa fa-search-plus fa-3x"></i>
              <div class="port-pop-title"><h2>${field.name}</h2></div>
            </div>
          </div>
          <img src="/asset/img/portfolio/${field.img}" class="img-responsive alt="${field.name}">
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
                  <img src="/asset/img/portfolio/${field.img}" class="img-responsive img-centered" alt="${field.name}">
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

/**
 * getSkill data from json
 * @method
 * @param  {string} data get url path
 * @return {string} return and appendTo div
 */
$.getJSON("/asset/database/skill.json", function (data) {
	var s_fontN = [];
	var s_backN = [];
	var s_design = [];
	var s_server = [];
	$.each(data, function (key, field) {
		if (field.cate === "frontend") {
			s_fontN.push(skillbar(field.name, field.power));
		}
		if (field.cate === "backend") {
			s_backN.push(skillbar(field.name, field.power));
		}
		if (field.cate === "design") {
			s_design.push(skillbar(field.name, field.power));
		}
		if (field.cate === "server") {
			s_server.push(skillbar(field.name, field.power));
		}
	});

	$(s_fontN.join("")).insertAfter(".skill-frontend");
	$(s_backN.join("")).insertAfter(".skill-backend");
	$(s_design.join("")).insertAfter(".skill-design");
	$(s_server.join("")).insertAfter(".skill-server");
});

/**
 * skillbar return skillhtml
 * @method skillbar
 * @param  {string} name  get skill name
 * @param  {number} power get percent
 * @return {string} html data
 */
function skillbar(name, power) {
	var key = Math.floor(Math.random() * 11) + 1;

	var is_color = [
		"#684ad7",
		"#7d3939",
		"#088",
		"#0d543b",
		"#5d1a60",
		"#0ea015",
		"#857104",
		"#9a0842",
		"#911111",
		"#11914c",
		"#113c91",
	];

	return `<div class="skill-g">
            <div class="col-md-4 "><p class="text-center">${name}</p></div>
            <div class="col-md-8">
              <div class="progress">
                <div class="progress-bar  progress-bar-success progress-bar-striped" role="progressbar" aria-valuenow="${power}" aria-valuemin="0" aria-valuemax="100" style="width:0; background-color:${is_color[key]}">
                </div>
              </div>
            </div>
          </div>`;
}

var map;
/**
 * [initMap google map api]
 * @method initMap
 * @return {[type]} [description]
 */
function initMap() {
	map = new google.maps.Map(document.getElementById("map"), {
		center: {
			lat: 13.7364836,
			lng: 100.5235114,
		},
		zoom: 12,
		/**
		 * [styles set map style]
		 * @type {Array}
		 */
		styles: [
			{
				elementType: "geometry",
				stylers: [
					{
						color: "#315274",
					},
				],
			},
			{
				elementType: "labels.text.fill",
				stylers: [
					{
						color: "#ffffff",
					},
				],
			},
			{
				elementType: "labels.text.stroke",
				stylers: [
					{
						color: "#1a3646",
					},
				],
			},
			{
				featureType: "administrative.country",
				elementType: "geometry.stroke",
				stylers: [
					{
						color: "#315274",
					},
				],
			},
			{
				featureType: "administrative.province",
				elementType: "geometry.stroke",
				stylers: [
					{
						color: "#315274",
					},
				],
			},
			{
				featureType: "landscape.natural",
				elementType: "geometry",
				stylers: [
					{
						color: "#315274",
					},
				],
			},
			{
				featureType: "poi",
				elementType: "labels.text.fill",
				stylers: [
					{
						color: "#ffffff",
					},
				],
			},
			{
				featureType: "poi.park",
				elementType: "geometry.fill",
				stylers: [
					{
						color: "#315274",
					},
				],
			},
			{
				featureType: "poi.park",
				elementType: "labels.text.fill",
				stylers: [
					{
						color: "#ffffff",
					},
				],
			},
			{
				featureType: "road",
				elementType: "geometry",
				stylers: [
					{
						color: "#0f1923",
					},
				],
			},
			{
				featureType: "road",
				elementType: "labels.text.fill",
				stylers: [
					{
						color: "#ffffff",
					},
				],
			},
			{
				featureType: "road.highway",
				elementType: "geometry.stroke",
				stylers: [
					{
						color: "#0f1924",
					},
				],
			},
			{
				featureType: "water",
				elementType: "geometry",
				stylers: [
					{
						color: "#0f1924",
					},
				],
			},
			{
				featureType: "water",
				elementType: "labels.text.fill",
				stylers: [
					{
						color: "#ffffff",
					},
				],
			},
		],
	});
}

$(".filter-button").click(function () {
	var value = $(this).attr("data-filter");
	if (value == "All") {
		$(".filter").show("15000");
	} else {
		$(".filter")
			.not("." + value)
			.hide("15000");
		$(".filter")
			.filter("." + value)
			.show("15000");
	}

	if ($(".filter-button").removeClass("active")) {
		$(this).removeClass("active");
	}
	$(this).addClass("active");
});
