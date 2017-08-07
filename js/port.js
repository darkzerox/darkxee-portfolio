$.getJSON("/portfolio.json", function(data) {
  var port_data = [];
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
          <img src="img/portfolio/${field.img}" class="img-responsive" alt="${field.name}">
        </a>
      </div>
    `);
  });

  $(port_data.join("")).appendTo(".portfolio-list");
});
