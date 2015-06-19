function(doc) {
  if (doc.search_cat && doc.search_cat.length > 0 && doc.date) {
	  for ( var i = 0 ; i< doc.search_cat.length; i++){
		  emit( [doc.idsite, doc.search_cat[i].value, doc.date], 1 );
	  }
  }
};
