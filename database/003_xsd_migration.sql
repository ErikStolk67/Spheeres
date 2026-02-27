-- ============================================================================
-- MetalSpheeres Dictionary Migration from XSD
-- Generated: 2026-02-27T11:02:16.637Z
-- Tables found in XSD: 79
-- ============================================================================

-- CD_CANV_CANV (13 fields)
CREATE TABLE IF NOT EXISTS cd_canv_canv (
    f_rootcanvas integer,
    k_canv1 integer NOT NULL,
    k_canv2 integer,
    k_seq integer,
    memo_plaintext varchar(500),
    memo bytea,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    f_dictionary integer,
    replicationid uuid,
    properties varchar(100),
    PRIMARY KEY (k_canv1)
);

-- CD_CANV_EXECUTION_LOG (9 fields)
CREATE TABLE IF NOT EXISTS cd_canv_execution_log (
    k_canv integer NOT NULL,
    k_seq integer,
    execution_id varchar(500),
    memo_plaintext varchar(500),
    memo bytea,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    PRIMARY KEY (k_canv)
);

-- CD_CANV_FUNC (11 fields)
CREATE TABLE IF NOT EXISTS cd_canv_func (
    k_canv integer NOT NULL,
    k_func integer,
    properties varchar(100),
    memo_plaintext varchar(500),
    memo bytea,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    f_dictionary integer,
    replicationid uuid,
    PRIMARY KEY (k_canv)
);

-- CD_CANV_LOGS (9 fields)
CREATE TABLE IF NOT EXISTS cd_canv_logs (
    k_canv integer NOT NULL,
    k_seq integer,
    status varchar(100),
    memo_plaintext varchar(500),
    memo bytea,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    PRIMARY KEY (k_canv)
);

-- CD_CANVASES (44 fields)
CREATE TABLE IF NOT EXISTS cd_canvases (
    k_canvas integer NOT NULL,
    f_type integer,
    name varchar(100),
    f_kind integer,
    f_icon integer,
    f_triggeraction integer,
    f_triggersubject integer,
    f_before_method integer,
    f_apitype integer,
    f_requesttype integer,
    f_apiparamtype integer,
    f_apikind integer,
    is_private boolean,
    is_repeatable boolean,
    url varchar(100),
    is_required boolean,
    defaultvalue varchar(500),
    test_value varchar(100),
    f_importmethod integer,
    xposition integer,
    yposition integer,
    executesync boolean,
    f_filledfrom integer,
    zposition integer,
    properties varchar(100),
    size integer,
    f_side integer,
    f_shape integer,
    f_protocol integer,
    collapsible boolean,
    code varchar(100),
    sort integer,
    memo_plaintext varchar(500),
    memo bytea,
    f_lifestatus integer,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    replicationid uuid,
    f_dictionary integer,
    f_owner_profile integer,
    f_owner integer,
    laststatusdate timestamptz,
    PRIMARY KEY (k_canvas)
);

-- CD_CNTR_CANV (10 fields)
CREATE TABLE IF NOT EXISTS cd_cntr_canv (
    k_cntr integer NOT NULL,
    k_canv integer,
    memo_plaintext varchar(500),
    memo bytea,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    f_dictionary integer,
    replicationid uuid,
    PRIMARY KEY (k_cntr)
);

-- CD_CNTR_CNTR (11 fields)
CREATE TABLE IF NOT EXISTS cd_cntr_cntr (
    k_cntr1 integer NOT NULL,
    k_cntr2 integer,
    main boolean,
    memo_plaintext varchar(500),
    memo bytea,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    f_dictionary integer,
    replicationid uuid,
    PRIMARY KEY (k_cntr1)
);

-- CD_CONTROLS (36 fields)
CREATE TABLE IF NOT EXISTS cd_controls (
    replicationid uuid,
    f_dictionary integer,
    k_control integer NOT NULL,
    f_type integer,
    name_en varchar(100),
    name_nl varchar(100),
    name varchar(100),
    f_kind integer,
    f_icon integer,
    f_record_lifestatus integer,
    f_destination_type integer,
    labelpos integer,
    properties varchar(100),
    use_field_name boolean,
    f_todo_entity integer,
    f_todo_type integer,
    f_todo_field integer,
    f_title_field integer,
    f_kanban_subject integer,
    f_screen integer,
    sort integer,
    f_format integer,
    memo_en bytea,
    memo_nl bytea,
    memo_en_plaintext varchar(500),
    memo_nl_plaintext varchar(500),
    memo_plaintext varchar(500),
    memo bytea,
    f_lifestatus integer,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    f_owner_profile integer,
    f_owner integer,
    laststatusdate timestamptz,
    PRIMARY KEY (k_control)
);

-- CD_DATABASES (24 fields)
CREATE TABLE IF NOT EXISTS cd_databases (
    replicationid uuid,
    f_dictionary integer,
    k_database integer NOT NULL,
    f_type integer,
    name varchar(100),
    f_kind integer,
    dbtype varchar(100),
    filename varchar(100),
    version varchar(100),
    network_key varchar(500),
    network_secret varchar(500),
    url varchar(100),
    licensenr varchar(100),
    path varchar(100),
    memo_plaintext varchar(500),
    memo bytea,
    f_lifestatus integer,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    f_owner_profile integer,
    f_owner integer,
    laststatusdate timestamptz,
    PRIMARY KEY (k_database)
);

-- CD_DBAS_DBAS (11 fields)
CREATE TABLE IF NOT EXISTS cd_dbas_dbas (
    k_dbas1 integer NOT NULL,
    k_dbas2 integer,
    main boolean,
    memo_plaintext varchar(500),
    memo bytea,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    f_dictionary integer,
    replicationid uuid,
    PRIMARY KEY (k_dbas1)
);

-- CD_DBAS_REMOTE (9 fields)
CREATE TABLE IF NOT EXISTS cd_dbas_remote (
    k_dbas integer NOT NULL,
    k_seq integer,
    f_user integer,
    remote_username varchar(500),
    connected boolean,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    PRIMARY KEY (k_dbas)
);

-- CD_DBAS_TABL (11 fields)
CREATE TABLE IF NOT EXISTS cd_dbas_tabl (
    k_dbas integer NOT NULL,
    k_tabl integer,
    main boolean,
    memo_plaintext varchar(500),
    memo bytea,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    f_dictionary integer,
    replicationid uuid,
    PRIMARY KEY (k_dbas)
);

-- CD_DICO_DICO (10 fields)
CREATE TABLE IF NOT EXISTS cd_dico_dico (
    k_dico1 integer NOT NULL,
    k_dico2 integer,
    k_seq integer,
    memo bytea,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    f_dictionary integer,
    replicationid uuid,
    PRIMARY KEY (k_dico1)
);

-- CD_DICT_DBAS (10 fields)
CREATE TABLE IF NOT EXISTS cd_dict_dbas (
    k_dbas integer NOT NULL,
    k_dict integer,
    memo_plaintext varchar(500),
    memo bytea,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    f_dictionary integer,
    replicationid uuid,
    PRIMARY KEY (k_dbas)
);

-- CD_DICTIONARIES (18 fields)
CREATE TABLE IF NOT EXISTS cd_dictionaries (
    swversion integer,
    udversion integer,
    replicationid uuid,
    k_dictionary integer NOT NULL,
    f_type integer,
    name varchar(100),
    f_kind integer,
    memo_plaintext varchar(500),
    memo bytea,
    f_lifestatus integer,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    lifedate timestamptz,
    f_owner_profile integer,
    f_owner integer,
    laststatusdate timestamptz,
    PRIMARY KEY (k_dictionary)
);

-- CD_DICTIONARYCOMPARISONS (18 fields)
CREATE TABLE IF NOT EXISTS cd_dictionarycomparisons (
    k_dictionarycomparison integer NOT NULL,
    f_type integer,
    name varchar(100),
    f_kind integer,
    alias varchar(100),
    value1 varchar(100),
    value2 varchar(100),
    memo bytea,
    f_lifestatus integer,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    replicationid uuid,
    f_owner_profile integer,
    f_owner integer,
    f_dictionary integer,
    laststatusdate timestamptz,
    PRIMARY KEY (k_dictionarycomparison)
);

-- CD_FIEL_CLUSTERSETTINGS (13 fields)
CREATE TABLE IF NOT EXISTS cd_fiel_clustersettings (
    k_fiel integer NOT NULL,
    k_seq integer,
    f_left_type integer,
    f_right_type integer,
    f_relationtype integer,
    f_left_status integer,
    f_right_status integer,
    f_relationtypevalue integer,
    clusteredmode integer,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    PRIMARY KEY (k_fiel)
);

-- CD_FIEL_CNTR (13 fields)
CREATE TABLE IF NOT EXISTS cd_fiel_cntr (
    k_cntr integer NOT NULL,
    k_fiel integer,
    main boolean,
    linkrequired boolean,
    memo_plaintext varchar(500),
    memo bytea,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    sort integer,
    f_dictionary integer,
    replicationid uuid,
    PRIMARY KEY (k_cntr)
);

-- CD_FIEL_FIEL (11 fields)
CREATE TABLE IF NOT EXISTS cd_fiel_fiel (
    k_fiel1 integer NOT NULL,
    k_fiel2 integer,
    main boolean,
    memo_plaintext varchar(500),
    memo bytea,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    f_dictionary integer,
    replicationid uuid,
    PRIMARY KEY (k_fiel1)
);

-- CD_FIEL_FIELDKEY (10 fields)
CREATE TABLE IF NOT EXISTS cd_fiel_fieldkey (
    replicationid uuid,
    f_dictionary integer,
    k_fiel integer NOT NULL,
    keytype varchar(100),
    k_seq integer,
    sortorder integer,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    PRIMARY KEY (k_fiel)
);

-- CD_FIEL_FIELDVALUE (9 fields)
CREATE TABLE IF NOT EXISTS cd_fiel_fieldvalue (
    replicationid uuid,
    f_dictionary integer,
    k_fiel integer NOT NULL,
    k_seq integer,
    fieldvalue varchar(100),
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    PRIMARY KEY (k_fiel)
);

-- CD_FIEL_KINDS (9 fields)
CREATE TABLE IF NOT EXISTS cd_fiel_kinds (
    k_fiel integer NOT NULL,
    k_seq integer,
    f_kind integer,
    f_showmode integer,
    label varchar(100),
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    PRIMARY KEY (k_fiel)
);

-- CD_FIEL_LINKEDITORVISIBILITY (16 fields)
CREATE TABLE IF NOT EXISTS cd_fiel_linkeditorvisibility (
    k_fiel integer NOT NULL,
    k_seq integer,
    f_left_type integer,
    f_right_type integer,
    f_left_kind integer,
    f_right_kind integer,
    label varchar(100),
    f_left_status integer,
    f_right_status integer,
    full_width boolean,
    font_styles varchar(500),
    font_color varchar(100),
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    PRIMARY KEY (k_fiel)
);

-- CD_FIEL_MATCH (13 fields)
CREATE TABLE IF NOT EXISTS cd_fiel_match (
    k_field integer NOT NULL,
    k_seq integer,
    f_match_type integer,
    f_match_mode integer,
    compare_value varchar(500),
    zero_score boolean,
    relative_weight integer,
    f_match_subject integer,
    f_match_fields varchar(500),
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    PRIMARY KEY (k_field)
);

-- CD_FIELDS (42 fields)
CREATE TABLE IF NOT EXISTS cd_fields (
    replicationid uuid,
    f_dictionary integer,
    k_field integer NOT NULL,
    f_type integer,
    name_en varchar(100),
    name_nl varchar(100),
    name varchar(100),
    f_kind integer,
    f_icon integer,
    sort integer,
    f_format integer,
    calculated_expression varchar(500),
    allowcustomvalue boolean,
    f_reference integer,
    f_property integer,
    f_propertymode integer,
    f_hyperlink_pkey integer,
    f_hyperlink_entity integer,
    filter_subtable boolean,
    f_filter_subtable_field integer,
    filter_subtable_k_seq boolean,
    f_filter_by_field integer,
    sort_description boolean,
    allowcreatingrecords boolean,
    hyperbehavior varchar(500),
    flags integer,
    storagesize integer,
    "default" varchar(100),
    memo_plaintext varchar(500),
    memo_en bytea,
    memo_en_plaintext varchar(500),
    memo_nl bytea,
    memo_nl_plaintext varchar(500),
    memo bytea,
    f_lifestatus integer,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    f_owner_profile integer,
    f_owner integer,
    laststatusdate timestamptz,
    PRIMARY KEY (k_field)
);

-- CD_FOLDERS (15 fields)
CREATE TABLE IF NOT EXISTS cd_folders (
    replicationid uuid,
    f_dictionary integer,
    k_folder integer NOT NULL,
    f_type integer,
    name varchar(100),
    f_kind integer,
    foldername varchar(100),
    f_lifestatus integer,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    f_owner_profile integer,
    f_owner integer,
    laststatusdate timestamptz,
    PRIMARY KEY (k_folder)
);

-- CD_FORM_CNTR (12 fields)
CREATE TABLE IF NOT EXISTS cd_form_cntr (
    k_cntr integer NOT NULL,
    k_form integer,
    k_seq integer,
    main boolean,
    memo_plaintext varchar(500),
    memo bytea,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    f_dictionary integer,
    replicationid uuid,
    PRIMARY KEY (k_cntr)
);

-- CD_FORM_FORM (11 fields)
CREATE TABLE IF NOT EXISTS cd_form_form (
    k_form1 integer NOT NULL,
    k_form2 integer,
    main boolean,
    memo_plaintext varchar(500),
    memo bytea,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    f_dictionary integer,
    replicationid uuid,
    PRIMARY KEY (k_form1)
);

-- CD_FORMS (26 fields)
CREATE TABLE IF NOT EXISTS cd_forms (
    replicationid uuid,
    f_dictionary integer,
    k_form integer NOT NULL,
    f_type integer,
    name_en varchar(100),
    name_nl varchar(100),
    name varchar(100),
    f_kind integer,
    version varchar(100),
    f_template integer,
    properties varchar(100),
    showpathrunner boolean,
    memo_plaintext varchar(500),
    memo_en bytea,
    memo_en_plaintext varchar(500),
    memo_nl bytea,
    memo_nl_plaintext varchar(500),
    memo bytea,
    f_lifestatus integer,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    f_owner_profile integer,
    f_owner integer,
    laststatusdate timestamptz,
    PRIMARY KEY (k_form)
);

-- CD_FUNC_FUNC (10 fields)
CREATE TABLE IF NOT EXISTS cd_func_func (
    k_func1 integer NOT NULL,
    k_func2 integer,
    memo_plaintext varchar(500),
    memo bytea,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    f_dictionary integer,
    replicationid uuid,
    PRIMARY KEY (k_func1)
);

-- CD_FUNCTIONS (31 fields)
CREATE TABLE IF NOT EXISTS cd_functions (
    k_function integer NOT NULL,
    f_type integer,
    name varchar(100),
    f_kind integer,
    alias varchar(100),
    f_before_method integer,
    url varchar(100),
    is_private boolean,
    is_repeatable boolean,
    defaultvalue varchar(500),
    test_value varchar(100),
    is_required boolean,
    f_apitype integer,
    f_requesttype integer,
    f_apiparamtype integer,
    f_apikind integer,
    f_paramdatatype integer,
    code varchar(100),
    sort integer,
    f_lifestatus integer,
    memo_plaintext varchar(500),
    memo bytea,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    replicationid uuid,
    f_owner_profile integer,
    f_owner integer,
    f_dictionary integer,
    laststatusdate timestamptz,
    PRIMARY KEY (k_function)
);

-- CD_LICENSES (37 fields)
CREATE TABLE IF NOT EXISTS cd_licenses (
    k_license integer NOT NULL,
    f_type integer,
    name varchar(100),
    f_kind integer,
    users_number integer,
    maxrole integer,
    expirationdate timestamptz,
    logo_file_name varchar(500),
    logo_file_data bytea,
    logo_file_type varchar(500),
    logo_thumbnail bytea,
    logo_annotations varchar(500),
    logo_original bytea,
    portal_users_number integer,
    gdpr_users_number integer,
    portal_securitywords integer,
    gdpr_securitywords integer,
    portal_concurrent_sessions integer,
    gdpr_concurrent_sessions integer,
    limited1_users_number integer,
    limited2_users_number integer,
    limited3_users_number integer,
    connection_users_number integer,
    remote_users_number integer,
    sbi_designer boolean,
    memo_plaintext varchar(500),
    memo bytea,
    f_lifestatus integer,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    replicationid uuid,
    f_dictionary integer,
    f_owner_profile integer,
    f_owner integer,
    laststatusdate timestamptz,
    PRIMARY KEY (k_license)
);

-- CD_LIFE_CANV (10 fields)
CREATE TABLE IF NOT EXISTS cd_life_canv (
    k_life integer NOT NULL,
    k_canv integer,
    memo_plaintext varchar(500),
    memo bytea,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    f_dictionary integer,
    replicationid uuid,
    PRIMARY KEY (k_life)
);

-- CD_LIFE_CHECKLIST (13 fields)
CREATE TABLE IF NOT EXISTS cd_life_checklist (
    k_life integer NOT NULL,
    name_en varchar(100),
    name_nl varchar(100),
    name varchar(100),
    f_type integer,
    k_seq integer,
    required boolean,
    valfield integer,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    sort integer,
    PRIMARY KEY (k_life)
);

-- CD_LIFE_LIFE (20 fields)
CREATE TABLE IF NOT EXISTS cd_life_life (
    k_life1 integer NOT NULL,
    k_life2 integer,
    k_seq integer,
    main boolean,
    json varchar(100),
    nextallowed boolean,
    f_approval integer,
    name_en varchar(100),
    name_nl varchar(100),
    name varchar(100),
    test_condition integer,
    f_processcard integer,
    memo_plaintext varchar(500),
    memo bytea,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    f_dictionary integer,
    replicationid uuid,
    PRIMARY KEY (k_life1)
);

-- CD_LIFESTATUSES (36 fields)
CREATE TABLE IF NOT EXISTS cd_lifestatuses (
    replicationid uuid,
    f_dictionary integer,
    k_lifestatus integer NOT NULL,
    f_type integer,
    name_en varchar(100),
    name_nl varchar(100),
    name varchar(100),
    f_kind integer,
    json varchar(100),
    sort integer,
    date_elapsed timestamptz,
    deadline_elapsed timestamptz,
    no_action_node boolean,
    multiple_actions boolean,
    f_nodetype integer,
    f_followupmode integer,
    is_autocomplete boolean,
    displaysort integer,
    default_retired boolean,
    f_subflow integer,
    locked boolean,
    memo_plaintext varchar(500),
    memo_en bytea,
    memo_en_plaintext varchar(500),
    memo_nl bytea,
    memo_nl_plaintext varchar(500),
    memo bytea,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    enabled boolean,
    f_lifestatus integer,
    f_owner_profile integer,
    f_owner integer,
    laststatusdate timestamptz,
    PRIMARY KEY (k_lifestatus)
);

-- CD_LK_APIKINDS (12 fields)
CREATE TABLE IF NOT EXISTS cd_lk_apikinds (
    k_apikind integer NOT NULL,
    name_en varchar(100),
    name_nl varchar(100),
    name varchar(100),
    enabled boolean,
    sort integer,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    replicationid uuid,
    f_dictionary integer,
    PRIMARY KEY (k_apikind)
);

-- CD_LK_APIPARAMTYPES (12 fields)
CREATE TABLE IF NOT EXISTS cd_lk_apiparamtypes (
    k_apiparamtype integer NOT NULL,
    name_en varchar(100),
    name_nl varchar(100),
    name varchar(100),
    enabled boolean,
    sort integer,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    replicationid uuid,
    f_dictionary integer,
    PRIMARY KEY (k_apiparamtype)
);

-- CD_LK_APITYPES (12 fields)
CREATE TABLE IF NOT EXISTS cd_lk_apitypes (
    k_apitype integer NOT NULL,
    name_en varchar(100),
    name_nl varchar(100),
    name varchar(100),
    enabled boolean,
    sort integer,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    replicationid uuid,
    f_dictionary integer,
    PRIMARY KEY (k_apitype)
);

-- CD_LK_APPROVALS (12 fields)
CREATE TABLE IF NOT EXISTS cd_lk_approvals (
    k_approval integer NOT NULL,
    name_en varchar(100),
    name_nl varchar(100),
    name varchar(100),
    enabled boolean,
    sort integer,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    replicationid uuid,
    f_dictionary integer,
    PRIMARY KEY (k_approval)
);

-- CD_LK_DATAROLES (10 fields)
CREATE TABLE IF NOT EXISTS cd_lk_dataroles (
    k_datarole integer NOT NULL,
    name varchar(100),
    enabled boolean,
    sort integer,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    replicationid uuid,
    f_dictionary integer,
    PRIMARY KEY (k_datarole)
);

-- CD_LK_FIELDFLAGS (13 fields)
CREATE TABLE IF NOT EXISTS cd_lk_fieldflags (
    replicationid uuid,
    f_dictionary integer,
    k_fieldflag integer NOT NULL,
    name varchar(100),
    f_language varchar(100),
    country varchar(100),
    enabled boolean,
    value integer,
    sort integer,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    PRIMARY KEY (k_fieldflag)
);

-- CD_LK_FOLLOWUPMODES (12 fields)
CREATE TABLE IF NOT EXISTS cd_lk_followupmodes (
    k_followupmode integer NOT NULL,
    name_en varchar(100),
    name_nl varchar(100),
    name varchar(100),
    enabled boolean,
    sort integer,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    replicationid uuid,
    f_dictionary integer,
    PRIMARY KEY (k_followupmode)
);

-- CD_LK_FONTSTYLES (10 fields)
CREATE TABLE IF NOT EXISTS cd_lk_fontstyles (
    k_fontstyle integer NOT NULL,
    name varchar(100),
    enabled boolean,
    sort integer,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    replicationid uuid,
    f_dictionary integer,
    PRIMARY KEY (k_fontstyle)
);

-- CD_LK_FORMATS (17 fields)
CREATE TABLE IF NOT EXISTS cd_lk_formats (
    replicationid uuid,
    f_dictionary integer,
    k_format integer NOT NULL,
    name varchar(100),
    f_icon integer,
    enabled boolean,
    datatype varchar(100),
    fmtoption varchar(100),
    mask varchar(100),
    systemdef varchar(100),
    sort integer,
    memo_plaintext varchar(500),
    memo bytea,
    createdate timestamptz DEFAULT now(),
    changedate timestamptz DEFAULT now(),
    createdby integer,
    changedby integer,
    PRIMARY KEY (k_format)
);

-- CD_LK_ICONS (14 fields)
CREATE TABLE IF NOT EXISTS cd_lk_icons (
    replicationid uuid,
    f_dictionary integer,
    k_icon integer NOT NULL,
    name varchar(100),
    f_language varchar(100),
    country varchar(100),
    enabled boolean,
    fontname varchar(100),
    graphical bytea,
    sort integer,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    PRIMARY KEY (k_icon)
);

-- CD_LK_IMPORTMETHODS (12 fields)
CREATE TABLE IF NOT EXISTS cd_lk_importmethods (
    k_importmethod integer NOT NULL,
    name_en varchar(100),
    name_nl varchar(100),
    name varchar(100),
    enabled boolean,
    sort integer,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    replicationid uuid,
    f_dictionary integer,
    PRIMARY KEY (k_importmethod)
);

-- CD_LK_KINDS (15 fields)
CREATE TABLE IF NOT EXISTS cd_lk_kinds (
    replicationid uuid,
    f_dictionary integer,
    k_kind integer NOT NULL,
    name_en varchar(100),
    name_nl varchar(100),
    name varchar(100),
    f_type integer,
    enabled boolean,
    sort integer,
    memo_plaintext varchar(500),
    memo bytea,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    PRIMARY KEY (k_kind)
);

-- CD_LK_LANGUAGES (18 fields)
CREATE TABLE IF NOT EXISTS cd_lk_languages (
    replicationid uuid,
    f_dictionary integer,
    k_language integer NOT NULL,
    name varchar(100),
    shortname varchar(100),
    enabled boolean,
    sort integer,
    flagbase64 varchar(100),
    flag_file_name varchar(500),
    flag_file_data bytea,
    flag_file_type varchar(500),
    flag_thumbnail bytea,
    flag_annotations varchar(500),
    flag_original bytea,
    createdby integer,
    changedby integer,
    createdate timestamptz DEFAULT now(),
    changedate timestamptz DEFAULT now(),
    PRIMARY KEY (k_language)
);

-- CD_LK_MATCH_CONDITIONS (10 fields)
CREATE TABLE IF NOT EXISTS cd_lk_match_conditions (
    k_match_condition integer NOT NULL,
    name varchar(100),
    enabled boolean,
    sort integer,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    replicationid uuid,
    f_dictionary integer,
    PRIMARY KEY (k_match_condition)
);

-- CD_LK_MATCH_MODES (10 fields)
CREATE TABLE IF NOT EXISTS cd_lk_match_modes (
    k_match_mode integer NOT NULL,
    name varchar(100),
    enabled boolean,
    sort integer,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    replicationid uuid,
    f_dictionary integer,
    PRIMARY KEY (k_match_mode)
);

-- CD_LK_MATCH_TYPES (10 fields)
CREATE TABLE IF NOT EXISTS cd_lk_match_types (
    k_match_type integer NOT NULL,
    name varchar(100),
    enabled boolean,
    sort integer,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    replicationid uuid,
    f_dictionary integer,
    PRIMARY KEY (k_match_type)
);

-- CD_LK_NODETYPES (12 fields)
CREATE TABLE IF NOT EXISTS cd_lk_nodetypes (
    k_nodetype integer NOT NULL,
    name_en varchar(100),
    name_nl varchar(100),
    name varchar(100),
    enabled boolean,
    sort integer,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    replicationid uuid,
    f_dictionary integer,
    PRIMARY KEY (k_nodetype)
);

-- CD_LK_OPERATIONTYPES (12 fields)
CREATE TABLE IF NOT EXISTS cd_lk_operationtypes (
    k_operationtype integer NOT NULL,
    name_en varchar(100),
    name_nl varchar(100),
    name varchar(100),
    enabled boolean,
    sort integer,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    replicationid uuid,
    f_dictionary integer,
    PRIMARY KEY (k_operationtype)
);

-- CD_LK_PARAMDATATYPES (12 fields)
CREATE TABLE IF NOT EXISTS cd_lk_paramdatatypes (
    k_paramdatatype integer NOT NULL,
    name_en varchar(100),
    name_nl varchar(100),
    name varchar(100),
    enabled boolean,
    sort integer,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    replicationid uuid,
    f_dictionary integer,
    PRIMARY KEY (k_paramdatatype)
);

-- CD_LK_PROPERTYMODES (10 fields)
CREATE TABLE IF NOT EXISTS cd_lk_propertymodes (
    k_propertymode integer NOT NULL,
    name varchar(100),
    enabled boolean,
    sort integer,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    replicationid uuid,
    f_dictionary integer,
    PRIMARY KEY (k_propertymode)
);

-- CD_LK_PROTOCOLS (8 fields)
CREATE TABLE IF NOT EXISTS cd_lk_protocols (
    k_protocol integer NOT NULL,
    name varchar(100),
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    replicationid uuid,
    f_dictionary integer,
    PRIMARY KEY (k_protocol)
);

-- CD_LK_RELATIONTYPEVALUES (16 fields)
CREATE TABLE IF NOT EXISTS cd_lk_relationtypevalues (
    k_relationtypevalue integer NOT NULL,
    name_en varchar(100),
    name_nl varchar(100),
    name varchar(100),
    enabled boolean,
    f_type integer,
    reverse_en varchar(100),
    reverse_nl varchar(100),
    reverse varchar(100),
    sort integer,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    f_dictionary integer,
    replicationid uuid,
    PRIMARY KEY (k_relationtypevalue)
);

-- CD_LK_REQUESTTYPES (12 fields)
CREATE TABLE IF NOT EXISTS cd_lk_requesttypes (
    k_requesttype integer NOT NULL,
    name_en varchar(100),
    name_nl varchar(100),
    name varchar(100),
    enabled boolean,
    sort integer,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    replicationid uuid,
    f_dictionary integer,
    PRIMARY KEY (k_requesttype)
);

-- CD_LK_SHAPES (8 fields)
CREATE TABLE IF NOT EXISTS cd_lk_shapes (
    k_shape integer NOT NULL,
    name varchar(100),
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    replicationid uuid,
    f_dictionary integer,
    PRIMARY KEY (k_shape)
);

-- CD_LK_SHOWMODES (10 fields)
CREATE TABLE IF NOT EXISTS cd_lk_showmodes (
    k_showmode integer NOT NULL,
    name varchar(100),
    enabled boolean,
    sort integer,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    replicationid uuid,
    f_dictionary integer,
    PRIMARY KEY (k_showmode)
);

-- CD_LK_SIDES (8 fields)
CREATE TABLE IF NOT EXISTS cd_lk_sides (
    k_side integer NOT NULL,
    name varchar(100),
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    replicationid uuid,
    f_dictionary integer,
    PRIMARY KEY (k_side)
);

-- CD_LK_SUBJECTAREAS (13 fields)
CREATE TABLE IF NOT EXISTS cd_lk_subjectareas (
    replicationid uuid,
    f_dictionary integer,
    k_subjectarea integer NOT NULL,
    name_en varchar(100),
    name_nl varchar(100),
    name varchar(100),
    f_icon integer,
    enabled boolean,
    sort integer,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    PRIMARY KEY (k_subjectarea)
);

-- CD_LK_TEMPLATES (10 fields)
CREATE TABLE IF NOT EXISTS cd_lk_templates (
    replicationid uuid,
    f_dictionary integer,
    k_template integer NOT NULL,
    name varchar(100),
    enabled boolean,
    sort integer,
    createdby integer,
    changedby integer,
    createdate timestamptz DEFAULT now(),
    changedate timestamptz DEFAULT now(),
    PRIMARY KEY (k_template)
);

-- CD_LK_TRIGGERACTIONS (10 fields)
CREATE TABLE IF NOT EXISTS cd_lk_triggeractions (
    k_triggeraction integer NOT NULL,
    name varchar(100),
    enabled boolean,
    sort integer,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    replicationid uuid,
    f_dictionary integer,
    PRIMARY KEY (k_triggeraction)
);

-- CD_LK_TRIGGERSUBJECTS (10 fields)
CREATE TABLE IF NOT EXISTS cd_lk_triggersubjects (
    k_triggersubject integer NOT NULL,
    name varchar(100),
    enabled boolean,
    sort integer,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    replicationid uuid,
    f_dictionary integer,
    PRIMARY KEY (k_triggersubject)
);

-- CD_ROLE_LIFE (12 fields)
CREATE TABLE IF NOT EXISTS cd_role_life (
    k_role integer NOT NULL,
    k_life integer,
    main boolean,
    sort integer,
    memo_plaintext varchar(500),
    memo bytea,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    f_dictionary integer,
    replicationid uuid,
    PRIMARY KEY (k_role)
);

-- CD_ROLES (20 fields)
CREATE TABLE IF NOT EXISTS cd_roles (
    k_role integer NOT NULL,
    f_type integer,
    name_en varchar(100),
    name_nl varchar(100),
    name varchar(100),
    f_kind integer,
    alias varchar(100),
    sort integer,
    f_lifestatus integer,
    memo_plaintext varchar(500),
    memo bytea,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    replicationid uuid,
    f_dictionary integer,
    f_owner_profile integer,
    f_owner integer,
    laststatusdate timestamptz,
    PRIMARY KEY (k_role)
);

-- CD_TABL_FIEL (25 fields)
CREATE TABLE IF NOT EXISTS cd_tabl_fiel (
    k_fiel integer NOT NULL,
    k_tabl integer,
    k_seq integer,
    main boolean,
    clusteredmode integer,
    tabletype integer,
    deftype integer,
    defvalue varchar(100),
    flags integer,
    gridorder integer,
    valallowedit boolean,
    valfield integer,
    valtable integer,
    valtype integer,
    aliasdefinition varchar(500),
    f_filledbyid integer,
    f_dependson integer,
    memo_plaintext varchar(500),
    memo bytea,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    f_dictionary integer,
    replicationid uuid,
    PRIMARY KEY (k_fiel)
);

-- CD_TABL_FORM (13 fields)
CREATE TABLE IF NOT EXISTS cd_tabl_form (
    k_form integer NOT NULL,
    k_tabl integer,
    main boolean,
    tabletype integer,
    f_fieldcollection integer,
    memo_plaintext varchar(500),
    memo bytea,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    f_dictionary integer,
    replicationid uuid,
    PRIMARY KEY (k_form)
);

-- CD_TABL_TABL (11 fields)
CREATE TABLE IF NOT EXISTS cd_tabl_tabl (
    k_tabl1 integer NOT NULL,
    k_tabl2 integer,
    main boolean,
    memo_plaintext varchar(500),
    memo bytea,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    f_dictionary integer,
    replicationid uuid,
    PRIMARY KEY (k_tabl1)
);

-- CD_TABL_TABSETTINGS (13 fields)
CREATE TABLE IF NOT EXISTS cd_tabl_tabsettings (
    k_tabl integer NOT NULL,
    k_seq integer,
    f_left_type integer,
    f_right_type integer,
    f_left_status integer,
    f_right_status integer,
    f_table integer,
    f_lookup integer,
    f_target_table integer,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    PRIMARY KEY (k_tabl)
);

-- CD_TABLES (41 fields)
CREATE TABLE IF NOT EXISTS cd_tables (
    replicationid uuid,
    f_dictionary integer,
    k_table integer NOT NULL,
    f_type integer,
    name_en varchar(100),
    name_nl varchar(100),
    name varchar(100),
    f_kind integer,
    query varchar(100),
    shortname varchar(100),
    isview boolean,
    tabletype integer,
    f_icon integer,
    entitycolor varchar(500),
    f_dynamic_fields varchar(500),
    reverse_pass_security boolean,
    one_parent boolean,
    ondelete integer,
    connection_string varchar(500),
    trigger varchar(100),
    sequence_type integer,
    ismergeview boolean,
    properties varchar(100),
    hidden boolean,
    insertonly boolean,
    sort integer,
    memo_plaintext varchar(500),
    memo_en bytea,
    memo_en_plaintext varchar(500),
    memo_nl bytea,
    memo_nl_plaintext varchar(500),
    memo bytea,
    f_lifestatus integer,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    f_owner_profile integer,
    f_owner integer,
    f_subjectarea integer,
    laststatusdate timestamptz,
    PRIMARY KEY (k_table)
);

-- CD_TRANSLATIONS (21 fields)
CREATE TABLE IF NOT EXISTS cd_translations (
    k_translation integer NOT NULL,
    f_type integer,
    name_en varchar(100),
    name_nl varchar(100),
    name varchar(100),
    f_kind integer,
    alias varchar(100),
    code integer,
    sort integer,
    f_lifestatus integer,
    memo_plaintext varchar(500),
    memo bytea,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    replicationid uuid,
    f_dictionary integer,
    f_owner_profile integer,
    f_owner integer,
    laststatusdate timestamptz,
    PRIMARY KEY (k_translation)
);

-- CD_TYPE_FILTERINGSETTINGS (8 fields)
CREATE TABLE IF NOT EXISTS cd_type_filteringsettings (
    k_type integer NOT NULL,
    k_seq integer,
    f_left_type integer,
    f_right_type integer,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    PRIMARY KEY (k_type)
);

-- CD_TYPE_LIFE (11 fields)
CREATE TABLE IF NOT EXISTS cd_type_life (
    k_life integer NOT NULL,
    k_type integer,
    main boolean,
    memo_plaintext varchar(500),
    memo bytea,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    f_dictionary integer,
    replicationid uuid,
    PRIMARY KEY (k_life)
);

-- CD_TYPE_RESTRICTIONS (8 fields)
CREATE TABLE IF NOT EXISTS cd_type_restrictions (
    k_type integer NOT NULL,
    k_seq integer,
    f_role integer,
    restriction integer,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    PRIMARY KEY (k_type)
);

-- CD_TYPE_TYPE (12 fields)
CREATE TABLE IF NOT EXISTS cd_type_type (
    k_type1 integer NOT NULL,
    k_type2 integer,
    k_seq integer,
    main boolean,
    memo_plaintext varchar(500),
    memo bytea,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    f_dictionary integer,
    replicationid uuid,
    PRIMARY KEY (k_type1)
);

-- CD_TYPES (30 fields)
CREATE TABLE IF NOT EXISTS cd_types (
    replicationid uuid,
    f_dictionary integer,
    k_type integer NOT NULL,
    name_en varchar(100),
    name_nl varchar(100),
    name varchar(100),
    f_kind integer,
    "default" boolean,
    f_icon integer,
    f_table integer,
    typetable integer,
    f_type integer,
    flowfolder boolean,
    isroot boolean,
    instancingmaximum integer,
    sort integer,
    memo_plaintext varchar(500),
    memo_en bytea,
    memo_en_plaintext varchar(500),
    memo_nl bytea,
    memo_nl_plaintext varchar(500),
    memo bytea,
    f_lifestatus integer,
    createdby integer,
    createdate timestamptz DEFAULT now(),
    changedby integer,
    changedate timestamptz DEFAULT now(),
    f_owner_profile integer,
    f_owner integer,
    laststatusdate timestamptz,
    PRIMARY KEY (k_type)
);

-- ============================================================================
-- Summary:
-- Main/Lookup tables: 45
-- Link/Sub tables: 34
-- Total: 79
-- ============================================================================
