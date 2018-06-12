(function() {
    //set up references to form fields
    var $startDate = $("#startDate"),
    $endDate = $("#endDate"),
    $searchPhrase = $("#searchPhrase"),
    //div where results are displayed
    $searchResultsDiv = $("#searchResultsDiv"),
    //js template to use for results
    searchResultTemplate = $("#searchResultTemplate"),
    //js template to use for alerts
    alertTemplate = $("#alertTemplate"),
    //div used to display alerts
    $alerDiv = $("#alertDiv"),
    //div containing the waiting icon
    $waitingDiv = $("#waitingDiv"),
    //AP api variables
    searchUrl = "/bin/apapi.searchForImages.html",
    downloadUrl = "/bin/apapi.getDownloads.html",
    apiKey = "AP api key",
    //referene to form form field used to assign tags to downloaded images
    tagFormId = "tags",
    //name of form field used to select the download path
    pathfieldFormId = "pathfield",
    //default download path
    downloadRootPath = "/content/dam/twccentral/Media/Producers",

    //method used to run an image search on AP's api
    searchForImages = function(event, page){
        var data = {},
        dateRange = "";

        $alerDiv.html("");
        clearSearchResults();

        if ($.trim($searchPhrase.val()).length === 0) {
            createAndDisplayAlert("alert-danger", "At least one search is required to do a search of images");
            return false;
        }
        $waitingDiv.modal('show');
        data.searchPhrase = $searchPhrase.val();
        data.sortBy = $("[name='sortBy']").val();

        if(page){
            data.page = page;
        }

        if ($startDate.val().length !== 0 && $endDate.val().length !== 0) {
            dateRange = "creationDate>=" + createDateString($startDate.val()) + " AND creationDate<=" + createDateString($endDate.val());
        }else if ($startDate.val().length !== 0) {
            dateRange = "creationDate>=" + createDateString($startDate.val());
        }else if ($endDate.val().length !== 0){
            dateRange = "creationDate<=" + createDateString($endDate.val());
        }

        if(dateRange.length !== 0){
            data.searchPhrase += " AND " + dateRange;
        }

        $.ajax(searchUrl, {
            "dataType": "json",
            "data": data,
            "error": function(jqXHR, textStatus, errorThrown) {
                createAndDisplayAlert("alert-danger", textStatus);
            },
            "success": function(data, textStatus, jqXHR) {
                if(data.entries){
                    var tmpAry = [];
                    //remove entries without full image
                    $.each(data.entries, function(i, obj){
                        if(obj.contentLinks && obj.contentLinks.length == 3){
                            tmpAry.push(obj);
                        }
                    });
                    data.entries = tmpAry;
                    displayResults(data);
                }else if(data.ErrorCode){
                    createAndDisplayAlert("alert-danger", data.ErrorCode.errorMessages);
                }else{
                    if(data.ErrorCode){
                        createAndDisplayAlert("alert-warning", data.ErrorCode.errorMessages);
                    }else{
                        createAndDisplayAlert("alert-warning", "No results found");
                    }
                }
            },
            "complete":function(jqXHR, textStatus){
                $waitingDiv.modal('hide');
            }
        });


    },
    //method used to display results returned by searchForImages method
    displayResults = function(data){
        console.log(data);
        var template = _.template(searchResultTemplate.html());
        $searchResultsDiv.append(template( {
            "images": data.entries,
            "apiKey": apiKey
        }));

        $(".jqpagination").jqPagination({
            current_page: data.startIndex,
            max_page: Math.ceil(data.totalResults / 50),
            paged: function(page) {
                searchForImages(null, page);
            }
        });
    },
    //helper method used to format a date string
    createDateString = function(dateStr) {
        var dateParts = dateStr.split("/");
        return dateParts[2] + "-" + dateParts[0] + "-" + dateParts[1];
    },
    //creates the path and tag form fields
    createPathFindDialog = function() {
        var pathfield = new CQ.form.PathField({
            rootPath: downloadRootPath,
            showTitlesInTree: false,
            renderTo: "pathfieldDiv",
            name: pathfieldFormId,
            id: pathfieldFormId,
            width: "250"
        });
        $("#pathfield").attr("size", "50");
        var tagtool = new CQ.tagging.TagInputField({
            name: tagFormId,
            id: tagFormId,
            namespaces: ['Producers'],
            renderTo: "taggingDiv"
        });
    },
    //clears search results
    clearSearchResults = function() {
        $searchResultsDiv.html('');
    },
    //helper method used to display alerts
	createAndDisplayAlert = function (type, message) {
	   var template = _.template(alertTemplate.html());
	   $alerDiv.html(template( {
			"alertType": type,
			"alertMessage": message
		}));
	},
    //method that makes the AP  api call to download all the images from the search
    //results that user has select
    downloadImages = function(){
        $alerDiv.html("");

        var data = {},
            imageIdArray = [],
            pathRegex = new RegExp(downloadRootPath);

        $("[name='imageId']:checked").each(function() {
            imageIdArray.push(this.value)
        });

        data.images = imageIdArray.join(",");
        data.path = CQ.Ext.getCmp(pathfieldFormId).getValue();
        data.tags = CQ.Ext.getCmp(tagFormId).getValue().join();

        //console.log("tag value",CQ.Ext.getCmp(tagFormId).getValue());
        //console.log("tag value join",CQ.Ext.getCmp(tagFormId).getValue().join());

        if (imageIdArray.length === 0) {
            createAndDisplayAlert("alert-danger", "No images are checked for download");
            return false;
        }

        if (!data.path.match(pathRegex)) {
            createAndDisplayAlert("alert-danger", "A Image Path must be provided.");
            return false;
        }
        $waitingDiv.modal('show');
        console.log(data);
        $.ajax(downloadUrl, {
            "dataType": "json",
            "data": data,
            "type": "post",
            "error": function(jqXHR, textStatus, errorThrown) {
                createAndDisplayAlert("alert-danger", "Error occured while trying to upload images");
            },
            "success": function(data, textStatus, jqXHR) {
                console.log(data);
                if(data.error){
                    createAndDisplayAlert("alert alert-danger", "<ul><li>" + data.error.errorMessages.join("<li>") + "</ul>");
                }else{
                    createAndDisplayAlert("alert alert-success", "Image(s) loaded to dam.");
                }

            },
            "complete": function(jqXHR, textStatus){
                $waitingDiv.modal('hide');
            }
        });
    },
    //method used to toggle the check box displayed beside images in the search results
    toggleImageSelectBox = function(event) {
        if (event.target.checked) {
            $("[name='imageId']").prop("checked", true)
        } else {
            $("[name='imageId']").prop("checked", false)
        }

    },
    //set click handlers, and initialize form fields
    init = function(){
        $('.ap-import-tab').addClass('active');
        $("#searchForImages").on("click", searchForImages);
        $(".downloadImages").on("click", downloadImages);
        $("#startDate").datepicker();
        $("#endDate").datepicker();
        $searchResultsDiv.on("click", "#selectAllCb", toggleImageSelectBox);
        $searchResultsDiv.popover({
            selector: '[rel=popover]',
            trigger: "hover"
        });

        createPathFindDialog();
    }

    init();
})();