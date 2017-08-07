$.getJSON( "/portfolio.json", function( data ) {
  var items = [];
  $.each( data, function( key, field ) {
     items.push( `
       <div class="col-sm-4 portfolio-item">
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
       ` );

  });

  $(items.join( "" )).appendTo( ".portfolio-list" );
});
