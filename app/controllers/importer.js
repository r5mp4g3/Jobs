app.controller('importerCTRL', function ($sce, $state, $auth, $uibModal, $stateParams, $timeout, toastr, focus, Upload, DataFactory, StorageFactory, currentUser) {
    //console.log('START - importerCTRL');

    var vm = this;
    vm.isValid = true;
    vm.errorMsg = [];
    vm.productList = [];
    vm.pubOptionsList = [];
    vm.pubSizes = [];
    vm.artwork_Types = [];
    vm.task = {};
    vm.animationsEnabled = true;
    vm.statusNum = 0;
    vm.developerLog = false;
    vm.isLogEnabled = StorageFactory.getAppSettings('LOG') ? true : false;
    vm.pubTypes = [{ code: 'CLS', name: 'Classified' }];
    vm.filesForDeletion = [];
    vm.qProductsError = false;
    vm.hdrStyle = { 'background-size': 'cover' };
    vm.readOnly = true;
    vm.docHistory = [];
    vm.docMessages = [];
    vm.cc_response_dsp = [];
    vm.base64 = null;
    vm.LogoGrps = null;
    vm.LogoGrpOptions = null;
    vm.trixEditor1 = false;
    vm.trixEditor2 = false;
    var host = StorageFactory.getAppSettings('UPL');
    var createStorageKey, host, uploadAttachment;
    var events = ['trixInitialize', 'trixChange', 'trixSelectionChange', 'trixFocus',
        'trixBlur', 'trixFileAccept', 'trixAttachmentAdd', 'trixAttachmentRemove'];

    for (var i = 0; i < events.length; i++) {
        vm[events[i]] = function (e) {
            //console.info('Event type:', e.type);
        }
    };

    vm.ACL = {
        //TRUE MEANS YOU ARE RESTRICTED
        section0: true,     //Permanent Read ONLY fields
        section1: true,     //Requestor Information
        section2: true,     //Specification  //Materials //Instructions 
        section3: true,     //Assignment Details
        section4: true,     //Preview of Completed Write Up - Copywriter
        section5: true,     //Preview of Completed Artwork  - Designer
        section6: true,     //Preview of Completed Artwork  - APPROVAL - sales
        section7: true,     //Product Details      
    };

    vm.cleanTrix = function (tmpStr, type) {
        var str = _.replace(tmpStr, new RegExp('"', "g"), "'");
        str = _.replace(str, new RegExp("<strong>", "g"), "");
        str = _.replace(str, new RegExp("</strong>", "g"), "");
        str = _.replace(str, new RegExp("<!--block-->", "g"), "");
        str = _.replace(str, new RegExp("</div>", "g"), "~*~");
        str = _.replace(str, new RegExp("<div>", "g"), "~*~");
        str = _.replace(str, new RegExp("<div", "g"), "~*~");
        str = _.replace(str, new RegExp("</span>", "g"), "~*~");
        str = _.replace(str, new RegExp("<span>", "g"), "~*~");
        str = _.replace(str, new RegExp("<span", "g"), "~*~");
        str = _.replace(str, new RegExp("</figure>", "g"), "~*~");
        str = _.replace(str, new RegExp("<figure>", "g"), "~*~");
        str = _.replace(str, new RegExp("<figure", "g"), "~*~");
        var res = str.split("~*~");

        //console.log('res', res);
        var newStr = "";
        for (i = 0; i < res.length; i++) {
            if (res[i].includes("data-trix")) {
                newStr = newStr + " ";
            } else if (res[i].includes("class='size'")) {
                newStr = newStr + " ";
            } else {
                newStr = newStr + " " + res[i];
            }
        }

        if (type == 'materials') {
            if (_.isNil(vm.task.materials)) {
            } else {
                for (i = 0; i < vm.task.materials.length; i++) {
                    if (_.isNil(vm.task.materials[i].base)) {
                    } else {
                        newStr = newStr + '<img src="' + vm.task.materials[i].base + '"/>';
                    }
                }
            }
        } else {
            if (_.isNil(vm.task.artwork)) {
            } else {
                for (i = 0; i < vm.task.artwork.length; i++) {
                    if (_.isNil(vm.task.artwork[i].base)) {
                    } else {
                        newStr = newStr + '<img src="' + vm.task.artwork[i].base + '"/>';
                    }
                }
            }
        }

        //console.log('newStr', newStr);
        //return $sce.trustAsHtml(newStr);
        return newStr;
    };
    vm.carousel = {
        preview: false,
        noWrap: false,
        interval: 5000,
        active: 0,
    };
    vm.artwork = {
        preview: false,
        noWrap: false,
        interval: 5000,
        active: 0,
    };

    vm.accessControl = function () {
        var tmpFlag = '';
        var tmpStatus = vm.task.status;
        if (_.isNil(tmpStatus)) {
            tmpStatus = "";
        } else {
            tmpStatus = tmpStatus.toLowerCase();
        }

        var accessLVL = parseInt(currentUser.role);

        if (tmpStatus == "new" || tmpStatus == "request re-submission") {
            vm.statusNum = 0;
        } else if (tmpStatus == "pending assignment" || tmpStatus == "cancellation request") {
            vm.statusNum = 1;
        } else if (tmpStatus == "in progress" || tmpStatus == "for revision") {
            vm.statusNum = 2;
        } else if (tmpStatus == "for approval") {
            vm.statusNum = 3;
        } else if (tmpStatus == "approve" || tmpStatus == "pending import") {
            vm.statusNum = 4;
        } else if (tmpStatus == "import completed") {
            vm.statusNum = 5;
        } else if (tmpStatus == "completed") {
            vm.statusNum = 6;
        } else if (tmpStatus == "cancelled") {
            vm.statusNum = 7;
        } else {
            vm.statusNum = 0;
        }

        var current_user = currentUser.id.toLowerCase().trim();
        var submitted_by = vm.task.submitted_by_username.toLowerCase().trim();
        var cc_response = "";
        if (_.isNil(vm.task.cc_response_username)) {
        } else {
            var cc_response = vm.task.cc_response_username.toLowerCase().trim();
        }
        var designer = '';
        if (_.isNil(vm.task.designer_username)) {
        } else {
            designer = vm.task.designer_username.toLowerCase().trim();
        }
        var writer = '';
        if (_.isNil(vm.task.writer_username)) {
        } else {
            writer = vm.task.writer_username.toLowerCase().trim();
        }

        if (accessLVL >= 25) {
            //Sales Team Lead /SALES
            if ((current_user == submitted_by) || (current_user == cc_response)) {
                if (vm.statusNum == 0) {
                    tmpFlag = 'sales';
                } else if (vm.statusNum == 3) {
                    tmpFlag = 'sales';
                } else {
                    tmpFlag = 'reader';
                }
            }
        } else if (accessLVL >= 20) {
            //CopyWriter           
            if ((current_user == submitted_by) || (current_user == cc_response)) {
                if (vm.statusNum == 0) {
                    tmpFlag = 'sales';
                } else if (vm.statusNum == 3) {
                    tmpFlag = 'sales';
                } else {
                    tmpFlag = 'reader';
                }
            } else if (current_user == writer) {
                if (vm.statusNum == 2) {
                    tmpFlag = 'writer';
                } else {
                    tmpFlag = 'reader';
                }
            }
        } else if (accessLVL >= 10) {
            //Designer1  /Designer2 /Backup    
            if (current_user == designer) {
                if ((vm.statusNum == 2) || (vm.statusNum == 4) || (vm.statusNum == 5) || (vm.statusNum == 6)) {
                    tmpFlag = 'designer';
                } else {
                    tmpFlag = 'reader';
                }
            }
        } else {
            tmpFlag = 'coordinator';
        }
        return tmpFlag;
    };
    vm.sectionControl = function () {
        if (vm.currentUser.canEdit == 'sales') {
            //SALES
            if (vm.statusNum == 0) {
                vm.ACL.section1 = false;
                vm.ACL.section2 = false;
                vm.ACL.section7 = false;
            } else if (vm.statusNum == 3) {
                vm.ACL.section6 = false;
                vm.ACL.section7 = false;
            }
        } else if (vm.currentUser.canEdit == 'writer') {
            //CopyWriter
            vm.ACL.section4 = false;
        } else if (vm.currentUser.canEdit == 'designer') {
            //Designer
            vm.ACL.section5 = false;
            vm.ACL.section7 = false;
        } else if (vm.currentUser.canEdit == 'coordinator') {
            //System Administrator & Coordinator
            vm.ACL.section1 = false;
            vm.ACL.section2 = false;
            vm.ACL.section3 = false;
            vm.ACL.section4 = false;
            vm.ACL.section5 = false;
            vm.ACL.section6 = false;
            vm.ACL.section7 = false;
        } else {
            //default
            vm.ACL.section1 = true;
            vm.ACL.section2 = true;
            vm.ACL.section3 = true;
            vm.ACL.section4 = true;
            vm.ACL.section5 = true;
            vm.ACL.section6 = true;
            vm.ACL.section7 = true;
        }
    };
    var uploadAttachment = function (attachment, type) {
        console.info('uploadAttachment type:', type);
        console.info('uploadAttachment to add:', attachment);

        if (type == "materials") {
            if (_.isNil(vm.task.materials)) vm.task.materials = [];
        } else {
            if (_.isNil(vm.task.artwork)) vm.task.artwork = [];
        }

        var details = {
            'formType': "task",
            'fileDesc': type,
            'traceNum': vm.task.task_no.toLowerCase(),
        };
        file = attachment.file;
        file.upload = Upload.upload({
            url: StorageFactory.getAppSettings('UPL'),
            method: 'POST',
            file: file,
            data: details,
        });

        file.upload.then(function (response) {
            //SUCCESS
            $timeout(function () {
                var res = response.data;
                //console.log('[uploadAttachment] - result : ' + JSON.stringify(res));
                console.info('uploadAttachment details:', details);
                if (res.indexOf("ERROR") > 0) {
                } else {
                    ////console.log('[uploadFiles] - file : ' + JSON.stringify(file));
                    var arr = res.split("/" + vm.task.task_no.toLowerCase() + "/");
                    var nam = "";
                    if (_.isString(arr[1])) nam = arr[1].trim();
                    //console.log('[uploadFiles] - nam : ' + JSON.stringify(nam));
                    if (nam != "") {
                        var fileTmp = {
                            name: arr[1],
                            size: file.size,
                            height: file.$ngfHeight,
                            width: file.$ngfWidth,
                            type: file.type,
                            blob: attachment.attachment.fileObjectURL,
                            url: "service/tmp/" + arr[0] + "/" + vm.task.task_no.toLowerCase() + "/" + encodeURIComponent(nam),
                            base: (file.type.includes("image/png") ? vm.base64 : null),
                            uploadBy: vm.currentUser.id,
                            uploadDt: moment(new Date()).format('YYYY-MM-DD HH:mm:ss'),
                        };
                        console.info('[uploadAttachment] - type:', type);
                        //console.log('[uploadAttachment] - fileTmp : ' + JSON.stringify(fileTmp));

                        if (type == "materials") {
                            vm.task.materials.push(fileTmp);
                        } else {
                            vm.task.artwork.push(fileTmp);
                        }
                    }
                }
            });
        }, function (response) {
            //FAILURE
            if (response.status > 0) {
                var errorMsg = response.status + ': ' + response.data;
                //console.log('[uploadAttachment] - errorMsg : ' + JSON.stringify(errorMsg));
            }
        }, function (evt) {
            file.progress = Math.min(100, parseInt(100.0 *
                evt.loaded / evt.total));
        });

    };
    var getFileObject = function (filePathOrUrl, cb) {
        getFileBlob(filePathOrUrl, function (blob) {
            cb(blobToFile(blob, 'image.png'));
        });
    };
    var getFileBlob = function (url, cb) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url);
        xhr.responseType = "blob";
        xhr.addEventListener('load', function () {
            cb(xhr.response);
        });
        xhr.send();
    };
    var blobToFile = function (blob, name) {
        blob.lastModifiedDate = new Date();
        blob.name = name;
        return blob;
    };
    vm.trixBlur = function (e, type) {
        if (type = "materials") {
            // //console.log('[trixBlur] materials : ', vm.task.materials_trix)
        } else {
            //  //console.log('[trixBlur] artwork : ', vm.task.artwork_trix)
        }
    };

    vm.trixAttachmentRemove = function (e, editor, type) {
        var attachment;
        attachment = e.attachment;
        console.info('attachment to remove:', attachment);
        //console.info('blob1:', attachment.attachment.fileObjectURL);
        if (type = "materials") {
            vm.trixEditor1 = true;
            for (i = 0; i < vm.task.materials.length; i++) {
                //console.info('blob2:', vm.task.artwork[i].blob);
                if (_.isNil(vm.task.materials[i])) {
                } else {
                    if (attachment.attachment.fileObjectURL == vm.task.materials[i].blob) {

                        if (_.isNil(vm.task.materials[i].url)) {
                        } else {
                            // vm.filesForDeletion.push(vm.task.materials[i].url.trim());
                        }
                        vm.task.materials[i] = null;
                    }
                }
            }
            vm.task.materials = DataFactory.cleanArray(vm.task.materials);
        } else {
            vm.trixEditor2 = true;
            for (i = 0; i < vm.task.artwork.length; i++) {
                //console.info('blob2:', vm.task.artwork[i].blob);
                if (_.isNil(vm.task.artwork[i])) {
                } else {
                    if (attachment.attachment.fileObjectURL == vm.task.artwork[i].blob) {

                        if (_.isNil(vm.task.artwork[i].url)) {
                        } else {
                            // vm.filesForDeletion.push(vm.task.artwork[i].url.trim());
                        }
                        vm.task.artwork[i] = null;
                    }
                }
            }
            vm.task.artwork = DataFactory.cleanArray(vm.task.artwork);
        }
    };

    vm.trixAttachmentAdd = function (e, editor, type) {
        var attachment, base64;
        attachment = e.attachment;
        vm.base64 = null;
        console.info('attachment to add:', attachment);

        var fileReader = new FileReader();
        fileReader.onload = function (event) {
            vm.base64 = event.target.result;
            ////console.log('base64: ' + JSON.stringify(base64));
        };

        if (attachment.file) {
            if (attachment.file.type.includes("image/png")) {
                fileReader.readAsDataURL(attachment.file);
                if (type == "materials") {
                    vm.trixEditor1 = true;
                } else {
                    vm.trixEditor2 = true;
                }
                return uploadAttachment(attachment, type);
            } else {
                editor.undo();
                return null;
            }
        }

    };
    vm.trixChange = function (e, editor, type) {
        if (type == "materials") {
            vm.trixEditor1 = true;
        } else {
            vm.trixEditor2 = true;
        }
    };
    vm.trixInitialize = function (e, editor, type) {
    };
    vm.editTask = function () {
        vm.readOnly = !vm.readOnly;
        vm.currentUser.userAction = 'edit';
        vm.sectionControl();
    };
    vm.getDocHistory = function (taskNum) {
        ////console.log('[getDocHistory] - jobNum : ' + jobNum);
        DataFactory.getDocHistory({ job_no: taskNum }).then(
            //success
            function (response) {
                vm.docHistory = response.data;
                //console.log('[getDocHistory] - response.data : ' + JSON.stringify(response.data));
                ////console.log('[getDocHistory] - response.status : ' + JSON.stringify(response.status));
                // error handler
            },
            function (response) {
                //console.log('[getDocHistory] Ooops, something went wrong..  \n ' + '\n param sent { job_no: ' + taskNum + ' } \n\n' + JSON.stringify(response));
            }
        );
    };
    vm.getChatHistory = function (taskNum) {
        ////console.log('[getDocHistory] - jobNum : ' + jobNum);
        DataFactory.getChatHistory({ task_no: taskNum }).then(
            //success
            function (response) {
                vm.docMessages = response.data;
                //console.log('[getChatHistory] - response.data : ' + JSON.stringify(response.data));
                ////console.log('[getChatHistory] - response.status : ' + JSON.stringify(response.status));
                // error handler
            },
            function (response) {
                //console.log('[getChatHistory] Ooops, something went wrong..  \n ' + '\n param sent { job_no: ' + taskNum + ' } \n\n' + JSON.stringify(response));
            }
        )
    };
    vm.toggleAnimation = function () {
        vm.animationsEnabled = !vm.animationsEnabled;
    };
    vm.formatMe = function (def) {
        ////console.log('def : ' + def);
        if (def == 'ad_spend') {
            ////console.log('ad_spend : ' + vm.task.ad_spend);
            vm.task.ad_spend = $filter('currency')(vm.task.ad_spend);
        } else if (def == 'ad_spend') {
            ////console.log('production_cost : ' + vm.task.production_cost);
            vm.task.production_cost = $filter('currency')(vm.task.production_cost);
        } else if (def == 'colour') {
            //////console.log('colour : ' + vm.task.colour);
            if (vm.task.colour == 'Spot Colour') focus('colour_option');
        } else if (def == 'feature') {
            if (vm.task.feature) {
                focus('feature_option');
            } else {
                vm.task.feature_option = "";
            }
        } else if (def == 'urgent') {
            if (vm.task.urgent) {
                focus('urgent_reason');
            } else {
                vm.task.urgent_reason = "";
            }
        }

    };
    // date and time picker
    vm.MaskConfig = DataFactory.getFilters();
    vm.dateTimePicker1 = {
        date: new Date(),
        default: new Date(),
        datepickerOptions: {
            showWeeks: false,
            startingDay: 1,
            dateDisabled: function (data) {
                //////console.log('data : ' + JSON.stringify(data));
                var flag = false;
                var todaysDate = new Date();
                var tempDate = new Date(data.date);
                if (data.mode === 'day') {
                    if (todaysDate.toDateString() == tempDate.toDateString()) {
                    } else if (tempDate < todaysDate) {
                        flag = true;
                    } else {
                        var day = tempDate.getDay();
                        if ((day === 6) || (day === 0)) { flag = true; }
                    }
                }
                return flag;
                //return (data.mode === 'day' && (new Date().toDateString() == data.date.toDateString()));
            }
        }
    };
    vm.dateTimePicker2 = {
        date: new Date(),
        default: new Date(),
        datepickerOptions: {
            showWeeks: false,
            startingDay: 1,
            dateDisabled: function (data) {
                //////console.log('data : ' + JSON.stringify(data));
                var flag = false;
                var todaysDate = new Date();
                var tempDate = new Date(data.date);
                if (data.mode === 'day') {
                    if (todaysDate.toDateString() == tempDate.toDateString()) {
                    } else if (tempDate < todaysDate) {
                        //flag = true;
                    } else {
                        //var day = tempDate.getDay();
                        //if ((day === 6) || (day === 0)) { flag = true; }
                    }
                }
                return flag;
                //return (data.mode === 'day' && (new Date().toDateString() == data.date.toDateString()));
            }
        }
    };
    vm.openCalendar = function (e, picker) {
        vm[picker].open = true;
    };

    vm.getImporterLogoGrp = function () {
        DataFactory.getImporterLogoGrp(vm.task.category).then(
            //success
            function (response) {
                console.log('[getImporterLogoGrp] - response.data : ' + JSON.stringify(response.data));
                console.log('[getImporterLogoGrp] - response.status : ' + JSON.stringify(response.status));
                vm.LogoGrps = response.data;
                vm.LogoGrpOptions = angular.copy(response.data);
            },
            //error handler
            function (response) {
                //console.log('[getCategory] Ooops, something went wrong..  \n ' + JSON.stringify(response));
            });
    }
    vm.getCategory = function () {
        vm.task.colour = null;
        vm.task.charge_option = null;
        vm.task.logo_group = null;
        vm.task.company = null;
        vm.task.company_tag = null;
        vm.task.description = null;
        vm.task.departed_date = null;
        vm.task.deceased_name = null;
        vm.task.filename = null;
        vm.LogoGrps = null;
        vm.productList = [];
        //console.log('[getCategory] category : ' + vm.task.category);
        vm.getImporterLogoGrp();
    };
    var isLetter = function (str) {
        return str.length === 1 && str.match(/[a-z]/i);
    };
    vm.getDefaultLogoGrp = function () {
        vm.task.logo_group = null;
        if (vm.task.category == 'Company Logo') {
            var res = vm.task.company.charAt(0);
            if (isNaN(res)) {
                if (isLetter(res)) vm.task.logo_group = "Co Logo " + res.toUpperCase().trim();
            } else {
                vm.task.logo_group = "Co Logo Numeric"
            }
        } else if (vm.task.category == 'Obituary Pix') {
            var res = vm.task.deceased_name.charAt(0);
            if (isNaN(res)) {
                if (isLetter(res)) {
                    vm.task.logo_group = "Obit Pix " + res.toUpperCase().trim();
                } else {
                    vm.task.logo_group = "Obit Symbol"
                }
            } else {
                vm.task.logo_group = "Obit Symbol"
            }
        } else {
            vm.task.logo_group = null;
        }
    };
    vm.filterLogoGrp = function () {
        console.log('[filterLogoGrp]  Start', vm.task.category);
        if (!_.isNil(vm.task.category)) {
            if (vm.task.category == 'Obituary Pix') {
            } else {
                vm.LogoGrps = angular.copy(vm.LogoGrpOptions);
                console.log('[filterLogoGrp] 0', vm.LogoGrps);
                console.log('[filterLogoGrp] 1', vm.task.charge_option);
                console.log('[filterLogoGrp] 2', vm.task.colour);
                console.log('[filterLogoGrp] 3', vm.task.language);
                if (!(_.isNil(vm.task.charge_option) && _.isNil(vm.task.colour) && _.isNil(vm.task.language))) {
                    vm.LogoGrps = _.filter(vm.LogoGrps, function (o) {
                        /*
                        var tmp1 = _.isEmpty(o.charge) ? "" : JSON.stringify(o.charge).toLowerCase().trim();
                        var tmp2 = _.isEmpty(o.colour) ? "" : JSON.stringify(o.colour).toLowerCase().trim();
                        var tmp3 = _.isEmpty(o.pub) ? "" : JSON.stringify(o.pub).toLowerCase().trim();

                        var key1 = _.isNil(vm.task.charge_option) ? "": vm.task.charge_option.toLowerCase().trim();
                        var key2 = _.isNil(vm.task.colour) ? "": vm.task.colour.toLowerCase().trim();
                        var key3 = _.isNil(vm.task.language) ? "": vm.task.language.toLowerCase().trim();

                        return (tmp1.includes(key1) && tmp2.includes(key2) && tmp3.includes(key3));
                        */
                        return _.includes(o.charge, vm.task.charge_option) && _.includes(o.colour, vm.task.colour) && _.includes(o.pub, vm.task.language);
                    });
                }
                console.log('[filterLogoGrp]  vm.LogoGrps', vm.LogoGrps)
            }
        }
    }
    vm.getTmpID = function () {
        DataFactory.getChildRequestorInf($stateParams.orderID).then(
            //success
            function (response) {
                //console.log('[getTmpID] - response.data : ' + JSON.stringify(response.data));
                //console.log('[getTmpID] - response.status : ' + JSON.stringify(response.status));
                vm.task = response.data;
                vm.task.creative_form = 'importer';
                vm.task.pub_type = 'CLS';
                vm.task.artwork_type = 'New';
                vm.task.status = 'new';
                vm.task.feature = false;
                vm.task.urgent = false;
                vm.task.title = $stateParams.orderTitle;
                vm.task.ad_spend = 0;
                vm.task.production_cost = 0;
                vm.task.parent_id = $stateParams.orderID;
                vm.task.logged_in_user = currentUser.id;
                //vm.task.in_house = "No";

                if (_.isNil(vm.task.cc_response) || vm.task.cc_response == '') {
                    vm.cc_response_dsp = [];
                } else {
                    vm.cc_response_dsp = _.uniq(vm.task.cc_response.split(","));
                }

                var res = $stateParams.taskID.split('~');
                vm.task.job_no = res[0];
                //console.log('res : ' + JSON.stringify(res[0]));
                vm.task.task_no = res.join("-");

                vm.task.size_option = "Other";
                vm.task.due_date = null;
                vm.task.change_date = null;
                vm.task.type = null;
                vm.task.pub_size = null;
                vm.task.materials = [];

                var tmpData = {
                    team_name: 'ClassifiedLAB',
                    division: 'Creative',
                    role: '5',
                    primary: '1',
                };

                DataFactory.getMember(tmpData).then(
                    //success
                    function (response) {
                        ////console.log('[getTmpID - getMember] - response.data : ' + JSON.stringify(response.data));
                        ////console.log('[getTmpID - getMember] - response.status : ' + JSON.stringify(response.status));
                        if (_.isNil(response.data) || _.isEmpty(response.data)) {
                        } else {
                            vm.task.team_head = response.data[0].name;
                            vm.task.team_head_username = response.data[0].username;
                        }

                        //console.log('[getTmpID - team_head] : ' + vm.task.team_head);
                        //console.log('[getTmpID - team_head_username] : ' + vm.task.team_head_username);
                    },
                    // error handler
                    function (response) {
                        //console.log('[getTmpID - getMember] Ooops, something went wrong..  \n ' + JSON.stringify(response));
                    }
                );

                vm.sectionControl();
                vm.defineType(true);
            },
            // error handler
            function (response) {
                //console.log('[getTmpID] Ooops, something went wrong..  \n ' + JSON.stringify(response));
            });


    };
    vm.getArtworkTypes = function () {
        var filter = {
            team: 'ClassifiedLAB',
            department: 'Creative',
        };
        DataFactory.getArtworkTypes(filter).then(
            //success
            function (response) {
                vm.artwork_Types = response.data;
                //console.log('response.data : ' + JSON.stringify(response.data));
                ////console.log('response.status : ' + JSON.stringify(response.status));
            },
            // error handler
            function (response) {
                ////console.log('Ooops, something went wrong..  \n ' + JSON.stringify(response));
            });
    };
    vm.getPubOptionsList = function () {
        DataFactory.getProductList().then(
            //success
            function (response) {
                //console.log('[getPubOptionsList] - response.data : ' + JSON.stringify(response.data));
                //console.log('[getPubOptionsList] - response.status : ' + JSON.stringify(response.status));
                var tmp = [];
                for (i = 0; i < response.data.length; i++) {
                    var option = {
                        product_name: response.data[i].product_name,
                        product_code: response.data[i].product_code,
                        language: response.data[i].language,
                    };
                    tmp.push(option);
                }

                vm.pubOptionsList = angular.copy(tmp);
                vm.pubOptions = angular.copy(tmp);
                vm.pubOptions.push({ product_name: 'OTHER', product_code: 'Other', language: '', });
            },
            // error handler
            function (response) {
                //console.log('[getPubOptionsList] - Ooops, something went wrong..  \n ' + JSON.stringify(response));
            }
        );
    };
    vm.getTask = function () {
        DataFactory.getTask($stateParams.taskID, 'importer').then(
            //success
            function (response) {
                //console.log('[getTask] - response.data : ' + JSON.stringify(response.data));
                ////console.log('response.status : ' + JSON.stringify(response.status));
                vm.task = response.data;
                vm.currentUser.canEdit = vm.accessControl();
                vm.task.parent_id = vm.task.job_id;
                if (vm.currentUser.canEdit == '') {
                    DataFactory.gotoDashBoard(vm.currentUser.role);
                } else {
                    vm.task.ad_spend = parseFloat(vm.task.ad_spend);
                    vm.task.production_cost = parseFloat(vm.task.production_cost);


                    if (_.isNil(vm.task.due_date)) {
                    } else {
                        vm.task.due_date = new Date(vm.task.due_date);
                    }

                    if (_.isNil(vm.task.change_date)) {
                    } else {
                        vm.task.change_date = new Date(vm.task.change_date);
                    }

                    if (vm.task.urgent > 0) vm.task.urgent = true;
                    if (vm.task.feature > 0) vm.task.feature = true;
                    vm.task.size_option = 'Other';
                    vm.productList = DataFactory.parseLodash(vm.task.products);

                    if (_.isNil(vm.task.cc_response) || vm.task.cc_response == '') {
                        vm.cc_response_dsp = [];
                    } else {
                        vm.cc_response_dsp = _.uniq(vm.task.cc_response.split(","));
                    }

                    if (_.isNil(vm.task.materials) || _.isEmpty(vm.task.materials) || vm.task.materials == "" || vm.task.materials == "[]") {
                        vm.task.materials = [];
                    } else {
                        vm.task.materials = DataFactory.cleanArray(DataFactory.parseLodash(vm.task.materials));
                    }

                    if (_.isNil(vm.task.materials_trix) || _.isEmpty(vm.task.materials_trix) || vm.task.materials_trix == "" || vm.task.materials_trix == "[]" || vm.task.materials_trix == "{}") {
                        vm.task.materials_trix = "";
                    } else {
                        vm.task.materials_trix = DataFactory.parseLodash(vm.task.materials_trix);
                    }

                    if (_.isNil(vm.task.artwork) || _.isEmpty(vm.task.artwork) || vm.task.artwork == "" || vm.task.artwork == "[]") {
                        vm.task.artwork = [];
                    } else {
                        vm.task.artwork = DataFactory.cleanArray(DataFactory.parseLodash(vm.task.artwork));
                    }

                    if (_.isNil(vm.task.artwork_trix) || _.isEmpty(vm.task.artwork_trix) || vm.task.artwork_trix == "" || vm.task.artwork_trix == "[]" || vm.task.artwork_trix == "{}") {
                        vm.task.artwork_trix = "";
                    } else {
                        vm.task.artwork_trix = DataFactory.parseLodash(vm.task.artwork_trix);
                    }

                    if (_.isNil(vm.task.article) || _.isEmpty(vm.task.article) || vm.task.article == "" || vm.task.article == "[]") {
                        vm.task.article = [];
                    } else {
                        vm.task.article = DataFactory.cleanArray(DataFactory.parseLodash(vm.task.article));
                    }

                    if (_.isNil(vm.task.ad_spend) || _.isEmpty(vm.task.ad_spend) || vm.task.ad_spend == '') {
                    } else {
                        vm.task.ad_spend = parseFloat(vm.task.ad_spend);
                    }

                    if (_.isNil(vm.task.production_cost) || _.isEmpty(vm.task.production_cost) || vm.task.production_cost == '') {
                    } else {
                        vm.task.production_cost = parseFloat(vm.task.production_cost);
                    }

                    if (vm.productList) {
                        if (_.isNil(vm.productList)) {
                        } else {
                            for (i = 0; i < vm.productList.length; i++) {
                                if (vm.productList[i].pubDate) {
                                    if (_.isNil(vm.productList[i].pubDate) || vm.productList[i].pubDate == '') {
                                    } else {
                                        vm.productList[i].pubDate = new Date(vm.productList[i].pubDate);
                                    }
                                };

                                if (vm.productList[i].etDate) {
                                    if (_.isNil(vm.productList[i].etDate) || vm.productList[i].etDate == '') {
                                    } else {
                                        vm.productList[i].etDate = new Date(vm.productList[i].etDate);
                                    }
                                };

                                if (vm.productList[i].cashDate) {
                                    if (_.isNil(vm.productList[i].cashDate) || vm.productList[i].cashDate == '') {
                                    } else {
                                        vm.productList[i].cashDate = new Date(vm.productList[i].cashDate);
                                    }
                                };
                            }
                        }
                    }

                    vm.getImporterLogoGrp();
                    vm.defineType(false);
                    vm.getDocHistory(vm.task.task_no);
                    vm.getChatHistory(vm.task.task_no);

                    if (vm.currentUser.canEdit == 'reader') {
                    } else {
                        vm.editTask();
                    }
                }
                //console.log('[getTask] - final.data : ' + JSON.stringify(vm.task));
            },
            // error handler
            function (response) {
                //console.log('Ooops, something went wrong..  \n ' + JSON.stringify(response));
            }
        );
    };
    vm.clearErrors = function () {
        ////console.log('set focus on : ' + vm.errorMsg[0].id);
        vm.isValid = true;
        focus(vm.errorMsg[0].id);
        vm.errorMsg = [];
    };
    vm.saveDraftTask = function () {
        vm.task.status = "Draft";
        vm.task.productList = JSON.stringify(vm.productList);
        if (vm.task.role) delete vm.task.role;
        if (vm.task.type) delete vm.task.type;
        if (vm.task.job_no) delete vm.task.job_no;
        if (vm.task.default_due_date) delete vm.task.default_due_date;
        if (vm.task.due_date) vm.task.due_date = moment(vm.task.due_date).format('YYYY-MM-DD HH:mm:ss');

        var passedID = null;
        if ($stateParams.action != "create") {
            passedID = vm.task.id;
            vm.task.logged_in_user = currentUser.id;
            vm.task._method = "put";
        }
        //console.log('submitted vm.task : ' + JSON.stringify(vm.task));

        DataFactory.uploadTask(vm.task, 'importer', passedID).then(
            //success
            function (response) {
                var modalInstance = $uibModal.open({
                    animation: vm.animationsEnabled,
                    templateUrl: 'partials/common/msgbox.html',
                    controller: 'msgBoxModalCtrl as ctrl',
                    resolve: {
                        parentData: function () {
                            var tmp = {
                                frm_class: 'box-importer',
                                frm_title: 'Success',
                                isConfirm: false,
                                msg: "Successfully saved Graphics Importer task and you will be redirected to dashboard.",
                            };
                            return tmp;
                        },
                        msgList: function () {
                            return null;
                        }
                    }
                }).result.then(
                    //success
                    function (submitVar) {
                        //console.log("submitted value inside parent controller", submitVar);
                        if (submitVar) DataFactory.gotoDashBoard(vm.currentUser.role);
                    },
                    //failure
                    function (submitVar) {
                        DataFactory.gotoDashBoard(vm.currentUser.role);
                    },
                )
            },
            // error handler
            function (response) {
                //console.log('[getTmpID] Ooops, something went wrong..  \n ' + JSON.stringify(response));
            });


    };
    vm.isAssigned = function () {
        var str = vm.task.designer_username;
        if (_.isNil(str) | _.isNil(str) || _.isEmpty(str) || str.trim() == '') {
            toastr.error("Please assign a designer.", {
                closeButton: true,
                onHidden: function () {
                    ////console.log('Calling toastr onHidden function');
                    vm.clearErrors();
                }
            });
        } else {
            vm.submitTask('In Progress');
        }
    };
    vm.submitTask = function (newStatus) {
        ////console.log('[submitTask] - newStatus : ' + newStatus);
        if (newStatus == 'Draft') {
            vm.isValid = true;
        } else {
            vm.isValid = vm.Validate();
        }
        vm.task.write_log = true;
        var bkup = angular.copy(vm.task);
        var prevStats = vm.task.status;

        if (vm.isValid) {
            if (_.isNil(newStatus) || newStatus == '') {
                //console.log('[submitTask] - 1');
                if (vm.task.designer) {
                    if (_.isNil(vm.task.designer) || vm.task.designer == '') {
                        vm.task.status = "Pending Assignment";
                        vm.task.sales_comment = '';
                    } else {
                        vm.task.status = "In Progress";
                        vm.task.sales_comment = '';
                    }
                } else {
                    vm.task.status = "Pending Assignment"
                }
            } else if (newStatus == 'Conversation reply') {
                vm.task.write_log = false;
            } else if (newStatus == 'Previous Status') {
                vm.task.status = vm.task.prev_status;
            } else if (newStatus == 'In Progress') {
                vm.task.final_size = angular.copy(vm.task.pub_size);
                vm.task.status = newStatus;
            } else {
                vm.task.status = newStatus;
            }

            if (vm.task.status == prevStats) {
                vm.task.log_msg = "Document was saved";
            } else {
                vm.task.prev_status = prevStats;
                vm.task.log_msg = "Document was saved from " + prevStats.toUpperCase() + " to " + vm.task.status.toUpperCase();
            }

            vm.carousel.preview = false;
            delete vm.task.role;
            delete vm.task.type;
            delete vm.task.job_no;
            delete vm.task.default_due_date;
            vm.task.due_date = (_.isNil(vm.task.due_date) ? null : moment(vm.task.due_date).format('YYYY-MM-DD'));
            vm.task.change_date = (_.isNil(vm.task.change_date) ? null : moment(vm.task.change_date).format('YYYY-MM-DD'));

            var passedID = null;
            if ($stateParams.action != "create") {
                passedID = vm.task.id;
                vm.task.logged_in_user = currentUser.id;
                vm.task._method = "put";
            }

            if (_.isNil(vm.productList) || _.isEmpty(vm.productList)) {
                vm.task.productList = [];
            } else {
                vm.task.productList = DataFactory.cleanArray(vm.productList);
            }

            if (_.isNil(vm.task.materials) || _.isEmpty(vm.task.materials)) {
                vm.task.materials = [];
            } else {
                vm.task.materials = DataFactory.cleanArray(vm.task.materials);
            }

            if (_.isNil(vm.task.artwork) || _.isEmpty(vm.task.artwork)) {
                vm.task.artwork = [];
            } else {
                vm.task.artwork = DataFactory.cleanArray(vm.task.artwork);
            }

            if (_.isNil(vm.task.article) || _.isEmpty(vm.task.article)) {
                vm.task.article = [];
            } else {
                vm.task.article = DataFactory.cleanArray(vm.task.article);
            }

            if (vm.trixEditor1 && vm.statusNum == 0) {
                if (_.isNil(vm.task.materials_trix) || _.isEmpty(vm.task.materials_trix)) {
                    vm.task.materials_trix = "";
                } else {
                    vm.task.materials_trix = vm.cleanTrix(vm.task.materials_trix, "materials");
                }
            }

            if (vm.trixEditor2 && vm.statusNum == 2) {
                if (_.isNil(vm.task.artwork_trix) || _.isEmpty(vm.task.artwork_trix)) {
                    vm.task.artwork_trix = "";
                } else {
                    vm.task.artwork_trix = vm.cleanTrix(vm.task.artwork_trix, "artwork");
                }
            }

            var tmpTsk = angular.copy(vm.task);
            tmpTsk.productList = JSON.stringify(tmpTsk.productList);
            tmpTsk.materials = JSON.stringify(tmpTsk.materials);
            tmpTsk.artwork = JSON.stringify(tmpTsk.artwork);
            tmpTsk.article = JSON.stringify(tmpTsk.article);
            tmpTsk.materials_trix = JSON.stringify(tmpTsk.materials_trix);
            tmpTsk.artwork_trix = JSON.stringify(tmpTsk.artwork_trix);

            delete tmpTsk.article;
            ////console.log('submitted vm.task : ' + JSON.stringify(tmpTsk));

            DataFactory.uploadTask(tmpTsk, 'importer', passedID).then(
                //success
                function (response) {
                    //console.log('[submitTask] - response : ' + JSON.stringify(response));

                    if (vm.filesForDeletion.length > -1) {
                        angular.forEach(vm.filesForDeletion, function (file) {
                            vm.clearFiles(file);
                        })
                    }

                    var modalInstance = $uibModal.open({
                        animation: vm.animationsEnabled,
                        templateUrl: 'partials/common/msgbox.html',
                        controller: 'msgBoxModalCtrl as ctrl',
                        resolve: {
                            parentData: function () {
                                var tmp = {
                                    frm_class: 'box-importer',
                                    frm_title: 'Success',
                                    isConfirm: false,
                                    msg: "Successfully saved Graphics Importer task and you will be redirected to dashboard.",
                                };
                                return tmp;
                            },
                            msgList: function () {
                                return null;
                            }
                        }
                    }).result.then(
                        //success
                        function (submitVar) {
                            //console.log("submitted value inside parent controller", submitVar);
                            if (submitVar) DataFactory.gotoDashBoard(vm.currentUser.role);
                        },
                        //failure
                        function (submitVar) {
                            DataFactory.gotoDashBoard(vm.currentUser.role);
                        },
                    )
                },
                // error handler
                function (response) {
                    //console.log('[submitTask] Ooops, something went wrong..  \n ' + JSON.stringify(response));
                    vm.errorMsg.push({ id: 'due_date', msg: response.data.error_msg })
                    toastr.error(response.data.error_msg, {
                        closeButton: true,
                        onHidden: function () {
                            ////console.log('Calling toastr onHidden function');
                            vm.clearErrors();
                        }
                    });
                    vm.task = angular.copy(bkup);
                });

        } else {
            //console.log('isValid : false | vm.errorMsg : ' + JSON.stringify(vm.errorMsg));
            toastr.error(vm.errorMsg[0].msg, {
                closeButton: true,
                onHidden: function () {
                    ////console.log('Calling toastr onHidden function');
                    vm.clearErrors();
                }
            });
        }
    };
    vm.Validate = function () {
        vm.errorMsg = [];
        var tmp = true;


        if (vm.task.artwork_type) {
            if (_.isNil(vm.task.artwork_type) || vm.task.artwork_type == '') vm.errorMsg.push({ id: 'artwork_type', msg: 'Job Classification is required.' });
        } else {
            vm.errorMsg.push({ id: 'artwork_type', msg: 'Job Classification is required.' });
        }

        if (vm.task.publication) {
            if (_.isNil(vm.task.publication) || vm.task.publication == '') {
                vm.errorMsg.push({ id: 'publication', msg: 'Publication is required.' });
            } else if (vm.task.publication == 'Other') {
                if (vm.task.other_pub) {
                    if (_.isNil(vm.task.other_pub) || vm.task.other_pub == '') vm.errorMsg.push({ id: 'other', msg: 'Other Information is required.' });
                } else {
                    vm.errorMsg.push({ id: 'other_pub', msg: 'Other Information is required.' });
                }
            }
        } else {
            vm.errorMsg.push({ id: 'publication', msg: 'Publication is required.' });
        }

        if (vm.task.pub_type) {
            if (_.isNil(vm.task.pub_type) || vm.task.pub_type == '') vm.errorMsg.push({ id: 'pub_type', msg: 'Publication Type is required.' });
        } else {
            vm.errorMsg.push({ id: 'pub_type', msg: 'Publication Type is required.' });
        }

        if (vm.task.size_option) {
            if (_.isNil(vm.task.size_option) || vm.task.size_option == '') {
                vm.errorMsg.push({ id: 'size_option', msg: 'Pre-defined size is required.' });
            } else if (vm.task.size_option == 'Other') {
                if (vm.task.pub_size) {
                    if (_.isNil(vm.task.pub_size) || vm.task.pub_size == '') vm.errorMsg.push({ id: 'pub_size', msg: 'Height x Cols is required.' });
                } else {
                    vm.errorMsg.push({ id: 'pub_size', msg: 'Height x Cols is required.' });
                }
            };
        } else {
            vm.errorMsg.push({ id: 'size_option', msg: 'Pre-defined size is required.' });
        }

        if (vm.task.language) {
            if (_.isNil(vm.task.language) || vm.task.language == '') vm.errorMsg.push({ id: 'language', msg: 'Language is required.' });
        } else {
            vm.errorMsg.push({ id: 'language', msg: 'Language is required.' });
        }

        if (vm.task.due_date) {
            if (_.isNil(vm.task.due_date) || vm.task.due_date == '') {
                vm.errorMsg.push({ id: 'due_date', msg: 'Due date is required.' });
            } else {
                var flg = false;
                var due1 = Date.parse(vm.task.default_due_date);
                var due2 = Date.parse(vm.task.due_date);
                if (vm.task.urgent) flg = vm.task.urgent;

                if (flg == false) {
                    if (due1 > due2) vm.errorMsg.push({ id: 'due_date', msg: 'Due date entered is less than minimum required by the sytem.\n Please click URGENT if correct.' });
                }
            }
        } else {
            vm.errorMsg.push({ id: 'due_date', msg: 'Due date is required.' });
        }

        if (vm.task.category) {
            if (_.isNil(vm.task.category) || vm.task.category == '') {
                vm.errorMsg.push({ id: 'category', msg: 'Category is required.' });
            } else if (vm.task.category == 'Obituary Pix') {
                if (vm.task.colour) {
                    if (_.isNil(vm.task.colour) || vm.task.colour == '') vm.errorMsg.push({ id: 'colour', msg: 'Colour is required.' });
                } else {
                    vm.errorMsg.push({ id: 'colour', msg: 'Colour is required.' });
                }

                if (vm.task.departed_date) {
                    if (_.isNil(vm.task.departed_date) || vm.task.departed_date == '') vm.errorMsg.push({ id: 'departed_date', msg: 'Departed Date is required.' });
                } else {
                    vm.errorMsg.push({ id: 'departed_date', msg: 'Departed Date is required.' });
                }

                if (vm.task.deceased_name) {
                    if (_.isNil(vm.task.deceased_name) || vm.task.deceased_name == '') vm.errorMsg.push({ id: 'deceased_name', msg: 'Deceased Name is required.' });
                } else {
                    vm.errorMsg.push({ id: 'deceased_name', msg: 'Deceased Name is required.' });
                }

                if (vm.task.logo_group) {
                    if (_.isNil(vm.task.logo_group) || vm.task.logo_group == '') vm.errorMsg.push({ id: 'logo_group', msg: 'Logo Group is required.' });
                } else {
                    vm.errorMsg.push({ id: 'logo_group', msg: 'Logo Group is required.' });
                }
            } else if (vm.task.category == 'Pix from Advertiser') {
                if (vm.task.charge_option) {
                    if (_.isNil(vm.task.charge_option) || vm.task.charge_option == '') vm.errorMsg.push({ id: 'charge_option', msg: 'Charges Option is required.' });
                } else {
                    vm.errorMsg.push({ id: 'charge_option', msg: 'Charges Option is required.' });
                }

                if (vm.task.colour) {
                    if (_.isNil(vm.task.colour) || vm.task.colour == '') vm.errorMsg.push({ id: 'colour', msg: 'Colour is required.' });
                } else {
                    vm.errorMsg.push({ id: 'colour', msg: 'Colour is required.' });
                }

                if (vm.task.logo_group) {
                    if (_.isNil(vm.task.logo_group) || vm.task.logo_group == '') vm.errorMsg.push({ id: 'logo_group', msg: 'Logo Group is required.' });
                } else {
                    vm.errorMsg.push({ id: 'logo_group', msg: 'Logo Group is required.' });
                }

                if (vm.task.description) {
                    if (_.isNil(vm.task.description) || vm.task.description == '') vm.errorMsg.push({ id: 'description', msg: 'Description is required.' });
                } else {
                    vm.errorMsg.push({ id: 'description', msg: 'Description is required.' });
                }
            } else if (vm.task.category == 'Company Logo') {
                if (vm.task.charge_option) {
                    if (_.isNil(vm.task.charge_option) || vm.task.charge_option == '') vm.errorMsg.push({ id: 'charge_option', msg: 'Charges Option is required.' });
                } else {
                    vm.errorMsg.push({ id: 'charge_option', msg: 'Charges Option is required.' });
                }

                if (vm.task.colour) {
                    if (_.isNil(vm.task.colour) || vm.task.colour == '') vm.errorMsg.push({ id: 'colour', msg: 'Colour Name is required.' });
                } else {
                    vm.errorMsg.push({ id: 'colour', msg: 'Colour is required.' });
                }

                if (vm.task.company) {
                    if (_.isNil(vm.task.company) || vm.task.company == '') vm.errorMsg.push({ id: 'company', msg: 'Company Name is required.' });
                } else {
                    vm.errorMsg.push({ id: 'company', msg: 'Company Name is required.' });
                }

                if (vm.task.company_tag) {
                    if (_.isNil(vm.task.company_tag) || vm.task.company_tag == '') vm.errorMsg.push({ id: 'company_tag', msg: 'Company information is incomplete.' });
                } else {
                    vm.errorMsg.push({ id: 'company_tag', msg: 'Company information is incomplete.' });
                }

                if (vm.task.logo_group) {
                    if (_.isNil(vm.task.logo_group) || vm.task.logo_group == '') vm.errorMsg.push({ id: 'logo_group', msg: 'Logo Group is required.' });
                } else {
                    vm.errorMsg.push({ id: 'logo_group', msg: 'Logo Group is required.' });
                }
            }
        } else {
            vm.errorMsg.push({ id: 'category', msg: 'Category is required.' });
        }
        /*
        if (vm.task.instruction) {
            if (_.isNil(vm.task.instruction) || vm.task.instruction == '') vm.errorMsg.push({ id: 'instruction', msg: 'Instruction is required.' });
        } else {
            vm.errorMsg.push({ id: 'instruction', msg: 'Instruction is required.' });
        }
        */
        if (vm.productList) {
            if (_.isNil(vm.productList) || vm.productList.length < 1) vm.errorMsg.push({ id: 'productList', msg: 'Product List is required.' });
        } else {
            vm.errorMsg.push({ id: 'productList', msg: 'Product List is required.' });
        }


        if (vm.errorMsg.length > 0) tmp = false;
        return tmp;
    };
    vm.gotoMain = function () {
        ////console.log('[gotoMain] - vm.currentUser.userAction = ' + vm.currentUser.userAction);
        if ((vm.currentUser.userAction == "create") || (vm.currentUser.userAction == "edit")) {
            var modalInstance = $uibModal.open({
                animation: vm.animationsEnabled,
                templateUrl: 'partials/common/msgbox.html',
                controller: 'msgBoxModalCtrl as ctrl',
                resolve: {
                    parentData: function () {
                        var tmp = {
                            frm_class: 'box-importer',
                            frm_title: 'Confirm Exit',
                            isConfirm: true,
                            msg: "Are you sure you want to go Job Request without saving your changes?",
                        };
                        return tmp;
                    },
                    msgList: function () {
                        return null;
                    }
                }
            }).result.then(
                function (submitVar) {
                    //console.log("submitted value inside parent controller", submitVar);
                    if (submitVar) vm.gotoParent();
                },
                function (res) {
                    //console.log("cancel gotoMain", res);
                },
            )
        } else {
            vm.gotoParent();
        }
    };
    vm.gotoParent = function () {
        //$state.go('creative', { orderID: $stateParams.orderID });
        var tmpID = null;
        if (_.isNil(vm.task.parent_id)) { } else { tmpID = vm.task.parent_id };
        if (_.isNil(tmpID)) {
            if (_.isNil(vm.task.job_id)) { } else { tmpID = vm.task.job_id };
        }
        if (_.isNil(tmpID)) {
            if (_.isNil($stateParams.orderID)) { } else { tmpID = $stateParams.orderID };
        }

        $state.go('creative', { orderID: tmpID });
    };
    vm.addProduct = function () {
        var initialValue = {
            product_code: null,
            product_name: null
        };
        var pubOptionsList = angular.copy(vm.pubOptionsList);

        if (_.isNil(vm.productList)) vm.productList = [];
        if (_.isEmpty(vm.productList)) {
            if (vm.task.publication == 'Other') {
                initialValue.product_code = vm.task.other_pub;
                initialValue.product_name = vm.task.other_pub;
                pubOptionsList.push(initialValue);
            } else {
                initialValue.product_code = vm.task.publication;
            }
        }
        pubOptionsList = _.sortedUniq(pubOptionsList);

        var tmpFileName = "";
        var ret = null;
        if (_.isNil(vm.task.category)) {
            toastr.error("Please select a Category", { closeButton: true });
        } else {
            if (vm.task.category == 'Company Logo') {
                var res = null;
                if (_.isNil(vm.task.company)) {
                    toastr.error("Please add the Company Name", { closeButton: true });
                } else {
                    res = vm.task.company.split(" ").join("-");
                }

                if (_.isNil(vm.task.company_tag)) {
                    toastr.error("Please complete the Company Information", { closeButton: true });
                } else {
                    tmpFileName = res + "-" + vm.task.company_tag;
                }
            } else if (vm.task.category == 'Obituary Pix') {
                var res = null;
                if (_.isNil(vm.task.deceased_name)) {
                    toastr.error("Please enter the Deceased name.", { closeButton: true });
                } else {
                    res = vm.task.deceased_name.split(" ").join("-");
                }

                if (_.isNil(vm.task.departed_date)) {
                    toastr.error("Please enter the Departed date.", { closeButton: true });
                } else {
                    tmpFileName = res + "-" + moment(new Date(vm.task.departed_date)).format('DDMMYYYY');
                }
            } else {
                if (_.isNil(vm.task.description)) {
                    toastr.error("Please enter the Description.", { closeButton: true });
                } else {
                    tmpFileName = vm.task.description.split(" ").join("-");
                }
            };

            if (tmpFileName != "") {
                if (_.isNil(vm.task.logo_group)) {
                    toastr.error("Please select the Logo Group.", { closeButton: true });
                } else {
                    tmpFileName = (vm.task.colour == "Colour") ? tmpFileName + "-clr" : tmpFileName;
                    ret = { category: vm.task.category, filename: tmpFileName.toLowerCase(), logoGrp: vm.task.logo_group };
                }
            }
        }

        if (_.isNil(ret)) {
        } else {
            var modalInstance = $uibModal.open({
                animation: vm.animationsEnabled,
                templateUrl: 'partials/products/importer.html',
                controller: 'importerModalCtrl as ctrl',
                resolve: {
                    parentData: function () {
                        var tmp = {
                            isList: true,
                            items: pubOptionsList,
                            filters: vm.MaskConfig,
                            details: ret,
                            initial: initialValue,
                            dueDate: vm.task.due_date,
                        };
                        return tmp;
                    },
                    product: function () {
                        return null;
                    }
                }
            }).result.then(function (submitVar) {
                //console.log("submitted value inside parent controller", submitVar);
                vm.productList.push(submitVar);
            })
        }
    };
    vm.editRow = function (option, ndex) {
        var tmpFileName = "";
        if (vm.task.category == 'Company Logo') {
            var res = vm.task.company.split(" ").join("-");
            tmpFileName = res + "-" + vm.task.company_tag;
        } else if (vm.task.category == 'Obituary Pix') {
            var res = vm.task.deceased_name.split(" ").join("-");
            tmpFileName = res + "-" + moment(new Date(vm.task.departed_date)).format('DDMMYYYY');
        } else {
            tmpFileName = vm.task.description.split(" ").join("-");
        };
        tmpFileName = (vm.task.colour == "Colour") ? tmpFileName + "-clr" : tmpFileName;
        var ret = { category: vm.task.category, filename: tmpFileName, logoGrp: vm.task.logo_group };
        var bak = angular.copy(option);
        var modalInstance = $uibModal.open({
            animation: vm.animationsEnabled,
            templateUrl: 'partials/products/importer.html',
            controller: 'importerModalCtrl as ctrl',
            resolve: {
                parentData: function () {
                    var tmp = {
                        isList: true,
                        items: vm.pubOptions,
                        //items: pubOptions,
                        filters: vm.MaskConfig,
                        details: ret,
                        dueDate: vm.task.due_date,
                    };
                    return tmp;
                },
                product: function () {
                    return bak;
                }
            }
        }).result.then(function (submitVar) {
            vm.productList[ndex] = submitVar;
        })
    };
    vm.selectUser = function (team, div, rol, retFld, order) {
        var tmpData = {
            team_name: team,
            is_Multiple: "0",
            division: div,
            role: rol,
            primary: order,
        };

        if (order == "1") {
            DataFactory.getMember(tmpData).then(
                //success
                function (response) {
                    //console.log('[selectUser - getMember] - response.data : ' + JSON.stringify(response.data));
                    //console.log('[selectUser - getMember] - response.status : ' + JSON.stringify(response.status));
                    vm.task.team_head = response.data[0].name;
                    vm.task.team_head_username = response.data[0].username;

                    //console.log('[selectUser - team_head] : ' + vm.task.team_head);
                    //console.log('[selectUser - team_head_id] : ' + vm.task.team_head_username);
                },
                // error handler
                function (response) {
                    //console.log('[selectUser - getMember] Ooops, something went wrong..  \n ' + JSON.stringify(response));
                }
            );
        } else {
            var default_val = vm.task[retFld + "_username"];
            var modalInstance = $uibModal.open({
                animation: vm.animationsEnabled,
                templateUrl: 'partials/common/member.html',
                controller: 'memberModalCtrl as ctrl',
                resolve: {
                    parentData: function () {
                        var tmp = {
                            frm_class: 'box-importer',
                            return_fld: retFld,
                            user_data: tmpData,
                            default: default_val,
                        };
                        return tmp;
                    },
                    members: function (DataFactory) {
                        return DataFactory.getMembers(tmpData);
                    }
                }
            }).result.then(function (submitVar) {
                //console.log("submitted value inside parent controller", submitVar);
                vm.task[retFld] = submitVar.name;
                vm.task[retFld + "_username"] = submitVar.username;
            })
        }
    };
    vm.getUser = function (user_id, tmpFld) {
        DataFactory.getRequestor(user_id).then(
            //success
            function (response) {
                //console.log('[getUser] - response.data : ' + JSON.stringify(response.data));
                //console.log('[getUser] - response.status : ' + JSON.stringify(response.status));

                if (tmpFld == 'submitted_by') {
                    vm.task.submitted_by = '';
                    vm.task.submitted_by_username = '';
                    vm.task.extension = '';
                    vm.task.mobile_no = '';
                    vm.task.team = '';
                }

                vm.task.cc_response = '';
                vm.task.cc_response_username = '';
                vm.task.cc_extension = '';
                vm.task.cc_mobile_no = '';
            },
            // error handler
            function (response) {
                //console.log('[getUser] Ooops, something went wrong..  \n ' + JSON.stringify(response));
            });
    };
    vm.computeDueDate = function () {
        var d = new Date();
        var n = d.getHours();
        //console.log('initial due : ' + JSON.stringify(d));
        for (i = 0; i < vm.artwork_Types.length; i++) {
            if (vm.artwork_Types[i].artwork_type == vm.task.artwork_type) {
                d.setHours(d.getHours() + vm.artwork_Types[i].due_date);
                break;
            }
        }
        //console.log('computed due : ' + JSON.stringify(d));
        vm.task.due_date = d;
        vm.task.default_due_date = d;
    };
    vm.defineLang = function () {
        //console.clear();
        //console.log('publication : ' + vm.task.publication + ' | language : ' + vm.task.language);
        for (i = 0; i < vm.pubOptionsList.length; i++) {
            //console.log('product_code : ' + vm.pubOptionsList[i].product_code);
            if (vm.task.publication == vm.pubOptionsList[i].product_code) {
                vm.task.language = vm.pubOptionsList[i].language;
                break;
            }
        }
        //console.log('language : ' + vm.task.language);
    };
    vm.defineSize = function () {
        ////console.log('size_option : ' + vm.task.size_option);
        for (i = 0; i < vm.pubSizes.length; i++) {
            ////console.log('pubSizes ['+ i +'] : ' + vm.pubSizes[i].size);
            if (vm.task.size_option == 'Other') {
                vm.task.pub_size = null;
                break;
            } else if (vm.task.size_option == vm.pubSizes[i].size) {
                var cols = vm.pubSizes[i].column;
                //console.log('column : ' + cols + ' | length : ' + cols.length);
                cols = (cols > 9) ? cols : ("0" + cols);
                //console.log('cols : ' + cols);

                var ht = vm.pubSizes[i].height;
                //console.log('ht : ' + ht + ' | length : ' + ht.length);
                ht = (ht > 9) ? ht : ("0" + ht);
                //console.log('ht : ' + ht);
                vm.task.pub_size = ht + " x " + cols;
                break;
            }
        }
    };
    vm.defineType = function (isChanged) {
        var param = { category: vm.task.pub_type };
        //console.log('defineType : ' + vm.task.pub_type);

        if (vm.task.pub_type == 'GIF') {
            vm.task.size_option = 'Other';
            if (isChanged) vm.task.pub_size = null;
            vm.pubSizes = [{ size: 'Other', height: 0, width: 0 }];
        } else {
            DataFactory.getSize(param).then(
                //success
                function (response) {
                    //console.log('[defineType] - response.data : ' + JSON.stringify(response.data));
                    //console.log('[defineType] - response.status : ' + JSON.stringify(response.status));
                    if (isChanged) {
                        vm.task.size_option = null;
                        vm.task.pub_size = null;
                    }
                    vm.pubSizes = response.data;
                    vm.pubSizes.push({ size: 'Other', height: 0, width: 0 });
                },
                // error handler
                function (response) {
                    //console.log('[getPubSize] Ooops, something went wrong..  \n ' + JSON.stringify(response));
                }
            )
        }
    };

    vm.revertTask = function (chatFlag) {
        var tmp = {
            frm_class: 'box-importer',
            frm_title: 'Request Re-Submission',
            isConfirm: false,
            isChat: true,
            msg: "Please enter your message.",
            user_role: vm.currentUser.canEdit,
        };

        if (_.isNil(chatFlag) || _.isEmpty(chatFlag) || chatFlag == '') {
            chatFlag = "";
            tmp.frm_title = "Conversation";
        } else if (chatFlag.includes('cancel')) {
            tmp.frm_title = "Cancellation Request";
            tmp.msg = "Please enter your reason for cancelling this task.";
        } else if (chatFlag == 'rejected') {
            tmp.frm_title = "Artwork for Revision";
            tmp.msg = "Please enter your reason for returning artwork.";
        } else {
            if (chatFlag == 'revert') tmp.msg = "Please enter your reason for returning task to sales.";
        }

        var modalInstance = $uibModal.open({
            animation: vm.animationsEnabled,
            templateUrl: 'partials/common/msgbox.html',
            controller: 'msgBoxModalCtrl as ctrl',
            resolve: {
                parentData: function () {
                    return tmp;
                },
                msgList: function () {
                    return vm.docMessages;
                }
            }
        }).result.then(
            //success
            function (submitVar) {
                ////console.log("submitted value inside parent controller : ", submitVar);
                //if (submitVar) $state.go('creative', { orderID: $stateParams.orderID });
                var tmpDate = new Date();

                var chat = {
                    senderID: vm.currentUser.id,
                    sender: vm.currentUser.name,
                    senderRole: vm.currentUser.canEdit,
                    prevStatus: vm.task.status,
                    sentDate: moment(tmpDate).format('YYYY-MM-DD HH:mm:ss'),
                    msg: submitVar,
                };

                vm.task.chatMsg = JSON.stringify(chat);
                //console.log("[revertTask] - " + JSON.stringify(vm.task));

                if (chatFlag == 'revert') {
                    //console.log("[revertTask] - 0");
                    vm.submitTask('Request Re-Submission');
                } else if (chatFlag == 'rejected') {
                    vm.task.sales_comment = submitVar;
                    vm.submitTask('For Revision');
                } else if (chatFlag == 'cancel') {
                    //console.log("[revertTask] - 1");
                    vm.submitTask('Cancellation Request');
                } else if (chatFlag == 'direct cancel') {
                    //console.log("[revertTask] - 1");
                    vm.submitTask('Cancelled');
                } else {
                    //console.log("[revertTask] - 2");
                    vm.submitTask('Conversation reply');
                }
            },
            //failure
            function (submitVar) {
                // $state.go('creative', { orderID: $stateParams.orderID });
            },
        )
    };

    vm.uploadFiles = function (files, type) {
        var details = {
            'formType': 'task',
            'fileDesc': type,
            'traceNum': vm.task.task_no,
        };
        //console.log('[uploadFiles] - details : ' + JSON.stringify(details));
        var timeStamp = new Date();

        if (type == 'artwork') {
            if (_.isNil(vm.task.artwork)) vm.task.artwork = [];
            if (_.isNil(vm.task.final_size) || _.isEmpty(vm.task.final_size) || vm.task.final_size == '') {
                vm.task.final_size = vm.task.pub_size;
            }
        } else if (type == 'article') {
            if (_.isNil(vm.task.article)) vm.task.article = [];
        } else {
            if (_.isNil(vm.task.materials)) vm.task.materials = [];
        }

        angular.forEach(files, function (file) {
            file.upload = Upload.upload({
                url: StorageFactory.getAppSettings('UPL'),
                method: 'POST',
                file: file,
                data: details,
            });

            file.upload.then(function (response) {
                //SUCCESS
                $timeout(function () {
                    var res = response.data;
                    //console.log('[uploadFiles] - result : ' + JSON.stringify(res));

                    if (res.indexOf("ERROR") > 0) {
                    } else {
                        ////console.log('[uploadFiles] - file : ' + JSON.stringify(file));
                        var arr = res.split("/" + vm.task.task_no + "/");
                        var nam = "";
                        if (_.isString(arr[1])) nam = arr[1].trim();

                        if (nam != "") {
                            var fileTmp = {
                                name: arr[1],
                                size: file.size,
                                height: file.$ngfHeight,
                                width: file.$ngfWidth,
                                type: file.type,
                                url: "service/tmp/" + arr[0] + "/" + vm.task.task_no.toLowerCase() + "/" + encodeURIComponent(nam),
                                uploadBy: vm.currentUser.id,
                                uploadDt: moment(timeStamp).format('YYYY-MM-DD HH:mm:ss'),
                            };
                            //console.log('[uploadFiles] - fileTmp : ' + JSON.stringify(fileTmp));

                            if (type == 'artwork') {
                                vm.task.artwork.push(fileTmp);
                                ////console.log('[uploadFiles] - artwork : ' + JSON.stringify(vm.task.artwork));
                            } else if (type == 'article') {
                                vm.task.article.push(fileTmp);
                                ////console.log('[uploadFiles] - article : ' + JSON.stringify(vm.task.article)); 
                            } else {
                                vm.task.materials.push(fileTmp);
                                ////console.log('[uploadFiles] - materials : ' + JSON.stringify(vm.task.materials));
                            }
                        }
                    }
                });
            }, function (response) {
                //FAILURE
                if (response.status > 0) {
                    var errorMsg = response.status + ': ' + response.data;
                    //console.log('[uploadFiles] - errorMsg : ' + JSON.stringify(errorMsg));
                }
            }, function (evt) {
                file.progress = Math.min(100, parseInt(100.0 *
                    evt.loaded / evt.total));
            });
        });

        if (type == 'artwork') {
            vm.task.artwork = DataFactory.cleanArray(vm.task.artwork);
        } else if (type == 'article') {
            vm.task.article = DataFactory.cleanArray(vm.task.article);
        } else {
            vm.task.materials = DataFactory.cleanArray(vm.task.materials);
        }
    };
    vm.clearFiles = function (file) {
        var ret = false;
        var url = file.trim();
        //console.log("Deleting uploaded file : " + url);
        DataFactory.deleteFiles({ fileLoc: url }).then(
            //success
            function (response) {
                //console.log('[clearFiles] - response.data : ' + JSON.stringify(response.data));
                //console.log('[clearFiles] - response.status : ' + JSON.stringify(response.status));
                ret = true;
            },
            // error handler
            function (response) {
                //console.log('[clearFiles] Ooops, something went wrong..  \n ' + JSON.stringify(response));
            });
        return ret;
    };
    vm.deleteFile = function (ndex, file, type) {
        //console.log('[deleteFile] - type : ' + type);
        //console.log('[deleteFile] - file : ' + JSON.stringify(file));

        if (_.isNil(file.url)) {
        } else {
            vm.filesForDeletion.push(file.url.trim());
        }

        if (type == 'article') {
            //vm.task.article
            vm.task.article[ndex] = null;
            vm.task.article = DataFactory.cleanArray(vm.task.article);
        } else if (type == 'artwork') {
            //vm.task.artwork
            vm.task.artwork[ndex] = null;
            vm.task.artwork = DataFactory.cleanArray(vm.task.artwork);
        } else {
            //vm.task.materials
            vm.task.materials[ndex] = null;
            vm.task.materials = DataFactory.cleanArray(vm.task.materials);
        }
    };
    vm.approveArtwork = function () {
        var hasTBD = false;
        var previewNotReady = false;
        /*
        for (i = 0; i < vm.productList.length; i++) {
            if ((vm.productList[i].etNum_tbd) || (vm.productList[i].etNum_tbd)) {
                hasTBD = true;
                break;
            }
        }
        */

        if (_.isNil(vm.task.artwork_trix) || vm.task.artwork_trix == '') {
            if (_.isNil(vm.task.artwork) || _.isEmpty(vm.task.artwork)) previewNotReady = true;
        }

        if (hasTBD) {
            toastr.error("Please update the ET Number or CASH number details in the Product table", { closeButton: true });
        } else if (previewNotReady) {
            toastr.error("Please upload an Artwork Preview", { closeButton: true });
            /* } else if (vm.task.pub_size != vm.task.final_size) {
                if (_.isNil(vm.task.final_ad_spend) || vm.task.final_ad_spend == "") {
                    toastr.error("Please update final ad spend.", { closeButton: true });
                } else if (parseFloat(vm.task.final_ad_spend) == 0) {
                    toastr.error("Please update final ad spend (orig. size: " + vm.task.pub_size + " -> final size: " + vm.task.final_size + " ).", { closeButton: true });
                } else {
                    if (parseFloat(vm.task.final_ad_spend) == parseFloat(vm.task.ad_spend)) toastr.error("Please update final ad spend (orig. size: " + vm.task.pub_size + " -> final size: " + vm.task.final_size + " ).", { closeButton: true });
                }
               
                if (_.isNil(vm.task.final_production_cost)  || vm.task.final_production_cost == "") {
                    toastr.error("Please update final ad spend.", { closeButton: true });
                } else if (parseFloat(vm.task.final_production_cost) == 0) {
                    if (parseFloat(vm.task.production_cost) > 0) toastr.error("Please update final production cost.", { closeButton: true });
                } else {
                    if (parseFloat(vm.task.final_production_cost) == parseFloat(vm.task.production_cost)) toastr.error("Please update final production cost.", { closeButton: true });                
                }
                */
        } else {
            vm.submitTask('Pending Import');
        }

    };
    vm.revertArtwork = function () {
        //console.log('[importer] - revertArtwork');
        if (_.isNil(vm.task.sales_comment) || vm.task.sales_comment == '') {
            toastr.error("Please add your reason for returning Artwork", { closeButton: true });
        } else {
            vm.submitTask('For Revision');
        }
    };
    vm.importComplete = function () {
        //import complete
        vm.submitTask('Import Complete');
    };
    vm.closeImporterTask = function () {
        //  completed
        vm.submitTask('Completed');
    };
    vm.deleteRow = function (ndex) {
        vm.productList[ndex] = null;
        vm.productList = DataFactory.cleanArray(vm.productList);
    };

    vm.printThis = function () {
        vm.hdrStyle = {};
        DataFactory.printThis();
        $timeout(function () { vm.hdrStyle = { 'background-size': 'cover' }; }, 5000);
    };

    vm.saveThis = function () {
        vm.hdrStyle = {};
        DataFactory.saveThis(vm.task.task_no);
        $timeout(function () { vm.hdrStyle = { 'background-size': 'cover' }; }, 5000);
    };

    vm.firstAction = function () {
        if ($stateParams.orderTitle == "enableLogging") vm.isLogEnabled = true;
        if ($stateParams.action == "create") {
            //console.log('[importer] - create');
            vm.currentUser.canEdit = 'sales';
            vm.readOnly = false;
            vm.getTmpID();
            vm.getPubOptionsList();
            vm.getArtworkTypes();
        } else {
            //console.log('[importer] - read');
            vm.readOnly = true;
            vm.getPubOptionsList();
            vm.getArtworkTypes();
            vm.getTask();
        };
    }

    if ($auth.isAuthenticated()) {
        if (_.isNil(currentUser)) {
            vm.currentUser = null;
            StorageFactory.setURI(window.location.href);
            $state.go('login');
        } else {
            //console.log('currentUser[1] : ' + JSON.stringify(currentUser));
            vm.currentUser = currentUser;
            vm.currentUser.canEdit = '';
            vm.currentUser.userAction = $stateParams.action;
            vm.firstAction();
        }
    } else {
        vm.currentUser = null;
        StorageFactory.setURI(window.location.href);
        $state.go('login');
    }

    ////console.log('$routeParams.orderId : ' + $routeParams.orderId);
    //console.log('END - importerCTRL');
});

app.controller('importerModalCtrl', function ($uibModalInstance, focus, toastr, parentData, product) {
    var vm = this;
    vm.pubOptions = parentData.items;
    vm.filter = parentData.filters;
    vm.detail = parentData.details;
    vm.formTitle = '';
    vm.final_ad_spend = 0;
    vm.final_cost = 0;

    if ((_.isNil(product)) || (_.isNil(product))) {
        vm.formTitle = "Add Product";
        vm.product = {
            pubID: parentData.initial.product_code,
            pubName: parentData.initial.product_name,
            pubDate: null,
            cashNum: null,
            cashNum_tbd: null,
            cashDate: null,
            filename: null,
            remark: null
        };


    } else {
        vm.formTitle = "Edit Product";
        vm.product = product;
        if (_.isNil(vm.product.pubDate)) {
        } else {
            vm.product.pubDate = new Date(vm.product.pubDate);
        }
        if (_.isNil(vm.product.cashDate)) {
        } else {
            vm.product.cashDate = new Date(vm.product.cashDate);
        }
    }

    if ((_.isNil(vm.pubOptions.title))) {
    } else {
        vm.formTitle = vm.pubOptions.title;
        vm.final_ad_spend = vm.pubOptions.ad_spend;
        vm.final_cost = vm.pubOptions.cost;
    }

    if ((_.isNil(parentData.isList))) {
        vm.isList = false;
    } else {
        vm.isList = parentData.isList;
        //console.log('items : ' + JSON.stringify(vm.pubOptions) + ' | dueDate : ' + parentData.dueDate + ' | isList : ' + parentData.isList);
        //console.log('filter : ' + JSON.stringify(vm.filter) + ' | ctrl.filter.cash : ' + JSON.stringify(vm.filter.cash));
    }

    // PUB date picker
    this.dateTimePicker1 = {
        date: new Date(parentData.dueDate),
        datepickerOptions: {
            showWeeks: false,
            startingDay: 1,
            dateDisabled: function (data) {
                var flag = false;
                //var todaysDate = new Date(parentData.dueDate);
                var todaysDate = new Date();
                var tempDate = new Date(data.date);
                ////console.log('todaysDate : ' + todaysDate.toDateString() + ' | tempDate : ' + tempDate.toDateString());
                if (data.mode === 'day') {
                    if (todaysDate.toDateString() == tempDate.toDateString()) {
                    } else if (tempDate < todaysDate) {
                        flag = true;
                    } else {
                        /*
                            var day = tempDate.getDay();
                            if ((day === 6) || (day === 0)) {
                                flag = true;
                            }
                        */
                    }
                }

                return flag;
            }
        }
    };
    // ET date picker
    this.dateTimePicker2 = {
        date: new Date(parentData.dueDate),
        datepickerOptions: {
            showWeeks: false,
            startingDay: 1,
            dateDisabled: function (data) {
                var flag = false;
                //var todaysDate = new Date(parentData.dueDate);
                var todaysDate = new Date();
                var tempDate = new Date(data.date);
                if (data.mode === 'day') {
                    if (todaysDate.toDateString() == tempDate.toDateString()) {
                    } else if (tempDate < todaysDate) {
                        flag = true;
                    } else {
                        /*
                            var day = tempDate.getDay();
                            if ((day === 6) || (day === 0)) {
                                flag = true;
                            }
                        */
                    }
                }

                return flag;
            }
        }
    };

    // CASH date picker
    this.dateTimePicker3 = {
        date: new Date(parentData.dueDate),
        datepickerOptions: {
            showWeeks: false,
            startingDay: 1,
            dateDisabled: function (data) {
                var flag = false;
                //var todaysDate = new Date(parentData.dueDate);
                var todaysDate = new Date();
                var tempDate = new Date(data.date);
                if (data.mode === 'day') {
                    if (todaysDate.toDateString() == tempDate.toDateString()) {
                    } else if (tempDate < todaysDate) {
                        flag = true;
                    } else {
                        /*
                            var day = tempDate.getDay();
                            if ((day === 6) || (day === 0)) {
                                flag = true;
                            }
                        */
                    }
                }

                return flag;
            }
        }
    };

    vm.openCalendar = function (e, picker) {
        vm[picker].open = true;
    };

    vm.clrField = function (fld) {
        if (fld == 'etNum') {
            vm.product.etNum = null;
        } else if (fld == 'etNum_tbd') {
            vm.product.etNum_tbd = null;
        } else if (fld == 'cashNum_tbd') {
            vm.product.cashNum_tbd = null;
            //console.log('vm.detail.category', vm.detail);
            var res = vm.detail.category.toLowerCase().trim();
            if (res.includes("company")) {
                //console.log('vm.filter.category1', res);
                //if (vm.filter.category == 'Company Logo') {
                vm.product.filename = vm.detail.filename;
            } else if (res.includes("obituary")) {
                //console.log('vm.filter.category2', res);
                //} else if (vm.filter.category == 'Obituary Pix') {
                vm.product.filename = vm.detail.filename;
            } else {
                //console.log('vm.filter.category3', res);
                vm.product.remark = vm.detail.logoGrp;
                vm.product.filename = vm.product.cashNum + "-" + vm.detail.filename;
            }
        } else {
            vm.product.cashNum = null;
        }
    };

    vm.ok = function () {
        if (vm.isList) {
            vm.sendProduct();
        } else {
            vm.sendPrice();
        }
    }

    vm.sendPrice = function () {
        var errMsg = [];
        //Height x Cols
        ad_spend = parseFloat(parentData.items.ad_spend);
        cost = parseFloat(parentData.items.production_cost);
        var res = parentData.items.initial.split("x");
        initial = parseInt(res[0]) * parseInt(res[1]);

        res = parentData.items.final.split("x");
        final = parseInt(res[0]) * parseInt(res[1]);

        if (final > initial) {
            if (vm.final_ad_spend < ad_spend) errMsg.push('Final Ad Spend must be higher than $ ' + ad_spend);
            if (vm.final_cost < cost) errMsg.push('Final Production Cost must be higher than $ ' + cost);
        } else {
            if (vm.final_ad_spend > ad_spend) errMsg.push('Final Ad Spend must be less than $ ' + ad_spend);
            if (vm.final_cost > cost) errMsg.push('Final Production Cost must be less than $ ' + cost);
        }

        if (errMsg.length > 0) {
            toastr.error(errMsg[0], { closeButton: true });
        } else {
            tmp = { final_cost: vm.final_cost, final_ad_spend: vm.final_ad_spend };
            $uibModalInstance.close(tmp);
        }
    }

    vm.sendProduct = function () {
        var errMsg = [];
        if (vm.product.pubID == '') errMsg.push('Publication is required');
        if (_.isNil(vm.product.pubDate)) errMsg.push('Publication date is required');
        if (_.isNil(vm.product.cashNum) || vm.product.cashNum == '') {
            errMsg.push('CASH number is required');
        }

        if (errMsg.length > 0) {
            toastr.error(errMsg[0], { closeButton: true });
        } else {
            var tmp = {
                pubID: vm.product.pubID,
                pubName: vm.product.pubName,
                pubDate: (_.isNil(vm.product.pubDate) ? null : moment(vm.product.pubDate).format('YYYY-MM-DD')),
                cashNum: vm.product.cashNum,
                remark: vm.product.remark,
                filename: vm.product.filename,
            }
            $uibModalInstance.close(tmp);
        }

    };

    vm.cancel = function () {
        $uibModalInstance.dismiss('cancel');
    };
});