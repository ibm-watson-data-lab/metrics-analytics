function(doc) {
  if (doc.search_cat && doc.search_cat.length > 0 && doc.date) {
	  var ar = doc.date.split("-");
	  for ( var i = 0 ; i< doc.search_cat.length; i++){
		  if ( ar.length == 3 ){
				emit([doc.idsite, Number(ar[0]), Number(ar[1]), Number(ar[2]), doc.search_cat[i].value], 1 );
		  }
	  }
  }
};
