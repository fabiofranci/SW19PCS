/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
$(document).ready(function() {
    // are we running in native app or in a browser?
    window.isphone = false;
    if(document.URL.indexOf("http://") === -1
        && document.URL.indexOf("https://") === -1) {
        window.isphone = true;
    }

    if( window.isphone ) {
        document.addEventListener("deviceready", onDeviceReady, false);
    } else {
        onDeviceReady();
    }
});

function onDeviceReady() {
    // do everything here.
    $(document).bind("pagebeforechange", function( event, data ) {
        $.mobile.pageData = (data && data.options && data.options.pageData)
            ? data.options.pageData
            : null;
    });

    function getDateTime() {
        var now     = new Date();
        var year    = now.getFullYear();
        var month   = now.getMonth()+1;
        var day     = now.getDate();
        var hour    = now.getHours();
        var minute  = now.getMinutes();
        var second  = now.getSeconds();
        if(month.toString().length == 1) {
            var month = '0'+month;
        }
        if(day.toString().length == 1) {
            var day = '0'+day;
        }
        if(hour.toString().length == 1) {
            var hour = '0'+hour;
        }
        if(minute.toString().length == 1) {
            var minute = '0'+minute;
        }
        if(second.toString().length == 1) {
            var second = '0'+second;
        }
        var dateTime = year+'-'+month+'-'+day+' '+hour+':'+minute+':'+second;
        return dateTime;
    }
    //---------------------------------------------------------------------------------------
    // (i) GLOBALI
    //---------------------------------------------------------------------------------------

    var firmacliente='';
    var global_ultimo_aggiornamento='';

    var AggiornamentiPostazioni=false;
    var AggiornamentiVisite=false;
    var AggiornamentiIspezioni=false;

    var IDDIPENDENTE=6;
    //Mettere il login con il PIN

    var db, len, datiRiga, lastinsertid=0, newid=0, VisiteInCorso=0, VisiteArchivio=0;
    var visitedb;

    var reteOk;
    var today = new Date();
    var READALL=1;

    var dd = today.getDate();
    var mm = today.getMonth()+1; //January is 0!
    var yyyy = today.getFullYear();

    if(dd<10) { dd='0'+dd; }

    if(mm<10) { mm='0'+mm; }

    today = dd+'/'+mm+'/'+yyyy;
    todayMySql = yyyy+'-'+mm+'-'+dd;

    var serviceURL = "http://www.lasaetta.studioweb19.it/admin/services/";
    var clienti_server;
    var sedi_clienti_server;
    var tipi_servizio_server;
    var postazioni_server;
    var visite_server;
    var ispezioni_server;
    var users_server;
    var scanText='';
    var postazioneCorrente={};
    var VisitaCorrente={};

    var sedi=new Array(); //lo popoliamo dopo getSediClientiListFromServer()
    var descrizioniservizio=new Array(); //lo popoliamo getTipiServizioListFromServer()
    var tipiservizio=new Array(); //lo popoliamo getTipiServizioListFromServer()
    var users=new Array(); //lo popoliamo dopo getUsersListFromServer()


// onSuccess Callback
// This method accepts a Position object, which contains the
// current GPS coordinates
//
    var onSuccessGeo = function(position) {
        alert('Latitude: '          + position.coords.latitude          + '\n' +
            'Longitude: '         + position.coords.longitude         + '\n' +
            'Altitude: '          + position.coords.altitude          + '\n' +
            'Accuracy: '          + position.coords.accuracy          + '\n' +
            'Altitude Accuracy: ' + position.coords.altitudeAccuracy  + '\n' +
            'Heading: '           + position.coords.heading           + '\n' +
            'Speed: '             + position.coords.speed             + '\n' +
            'Timestamp: '         + position.timestamp                + '\n');
    };

// onError Callback receives a PositionError object
//
    function onErrorGeo(error) {
        alert('code: '    + error.code    + '\n' +
            'message: ' + error.message + '\n');
    }

    function getPosizione() {
        try {
            navigator.geolocation.getCurrentPosition(onSuccessGeo, onErrorGeo);
        } catch (err) {
            alert("Sono in locale, niente posizione");
        }
    }



    //-------------------------------------------------
    // GESTIONE CONNESSIONE //per ora non funziona
    //-------------------------------------------------
    function checkConnessione() {
        try {
            var networkstate = navigator.connection.type;
            var stato = {};
            stato[Connection.UNKNOWN]  = 'Connessione sconosciuta';
            stato[Connection.ETHERNET] = 'Connessione Ethernet';
            stato[Connection.WIFI]     = 'Connessione WiFi';
            stato[Connection.CELL_2G]  = 'Connessione Cell 2G';
            stato[Connection.CELL_3G]  = 'Connessione Cell 3G';
            stato[Connection.CELL_4G]  = 'Connessione Cell 4G';
            stato[Connection.CELL]     = 'Connessione Cell generica';
            stato[Connection.none]     = 'Nessuna connessione';

            //alert(networkstate);

            if (networkstate == 'none') {
                //alert("Niente connessione");
                return 0;
            } else {
                //alert(stato[networkstate]);
                return 1;
            }
        } catch (err) {
            //alert("Sono in locale, niente controllo connessione, ma dico 1");
            return 1;
        }
    }

    function sincronizzaDaServer() {

        var Connessione=checkConnessione();
        if (Connessione) {
            //alert(global_ultimo_aggiornamento);
            AggiornaSuServer();
            getClientiListFromServer();
            getSediClientiListFromServer();
            getTipiServizioListFromServer();
            getPostazioniListFromServer();
            getVisiteListFromServer();
            getIspezioniListFromServer();
            setUltimoAggiornamento();
        } else {
            alert("Nessuna connessione, sincronizzazione non possibile!");
        }
    }

    function aproDatabase() {
        db.transaction(creoDb, onDbError, onDbOpenSuccess);
    }

    function creoDb(tx) {
        tx.executeSql("CREATE TABLE IF NOT EXISTS SERVER_CLIENTI (id INTEGER PRIMARY KEY, nome_o_ragione_sociale, partita_iva, codice_fiscale, tipo, persona_di_riferimento, telefono, email, note,ultimo_aggiornamento )");
        tx.executeSql("CREATE TABLE IF NOT EXISTS SERVER_SEDI_CLIENTI (id INTEGER PRIMARY KEY, cliente_e_sede, sede, indirizzo, CAP, citta, provincia, persona_di_riferimento, telefono, email, note,ultimo_aggiornamento)");
        tx.executeSql("CREATE TABLE IF NOT EXISTS SERVER_TIPI_SERVIZIO (id INTEGER PRIMARY KEY, servizio, descrizione_servizio,ultimo_aggiornamento )");
        tx.executeSql("CREATE TABLE IF NOT EXISTS SERVER_USERS (id INTEGER PRIMARY KEY, id_ruolo, PIN, Nome, Cognome, email,ultimo_aggiornamento)");
        tx.executeSql("CREATE TABLE IF NOT EXISTS LOCAL_POSTAZIONI (codice_postazione PRIMARY KEY, id_sede, id_servizio, nome,ultimo_aggiornamento)");
        tx.executeSql("CREATE TABLE IF NOT EXISTS LOCAL_VISITE (codice_visita PRIMARY KEY, id_sede, id_dipendente, data_inizio_visita, data_fine_visita, stato_visita,ultimo_aggiornamento,azioni_correttive,nr_certificato,c1a,c2a,c3a,c4a,c5a,c1b,c2b,c3b,c4b,c5b,c6b,c7b,c8b,c9b,c10b,c11b,c12b,c13b,c14b,c15b,c16b,c17b,c18b,c18btesto,c1c,c2c,c1d,c2d,c3d,c4d,c5d,c6d,c6dtesto,c1e,c2e,c3e,c4e,c6e,c7etesto,nome_cliente_firma,firma_cliente)");
        tx.executeSql("CREATE TABLE IF NOT EXISTS LOCAL_ISPEZIONI (codice_ispezione PRIMARY KEY, codice_postazione, codice_visita, ultimo_aggiornamento, data_ispezione, stato_postazione, stato_esca_roditori, collocato_adescante_roditori, stato_piastra_collante_insetti_striscianti, ooteche_orientalis, adulti_orientalis, ooteche_germanica, adulti_germanica, ooteche_supella_longipalpa, adulti_supella_longipalpa, ooteche_periplaneta_americana, adulti_periplaneta_americana, stato_piastra_insetti_volanti, presenza_muscidi, presenza_imenotteri_vespidi, presenza_imenotteri_calabronidi, presenza_dittere, presenza_altri_tipi_insetti, note_per_cliente, nutrie_tana, nutrie_target, presenza_target_lepidotteri, tipo_target_lepidotteri, latitudine, longitudine )");
        tx.executeSql("CREATE TABLE IF NOT EXISTS LOCAL_ULTIMOAGGIORNAMENTO (id INTEGER PRIMARY KEY, ultimo_aggiornamento)");
        sincronizzaDaServer();
        return 1;
    }

    function pulisciDataBase(tx) {
        tx.executeSql("DROP TABLE IF EXISTS SERVER_CLIENTI");
        tx.executeSql("DROP TABLE IF EXISTS SERVER_SEDI_CLIENTI");
        tx.executeSql("DROP TABLE IF EXISTS SERVER_TIPI_SERVIZIO");
        tx.executeSql("DROP TABLE IF EXISTS SERVER_USERS");
        tx.executeSql("DROP TABLE IF EXISTS LOCAL_POSTAZIONI");
        tx.executeSql("DROP TABLE IF EXISTS LOCAL_VISITE");
        tx.executeSql("DROP TABLE IF EXISTS LOCAL_ISPEZIONI");
        tx.executeSql("DROP TABLE IF EXISTS LOCAL_ULTIMOAGGIORNAMENTO");
        var global_ultimoaggiornamento='';
        //aproDatabase(); //ricreo il db e lo risincronizzo
    }

    function onDbError(error) {
        alert("Errore database " + error.message);
    }
    function onDbError1(error) {
        alert("Errore database 1 " + error.message);
    }

    function onDbOpenSuccess() {
        //alert("Ok db creato e connesso");
    }
    function onDbClearSuccess() {
        db.transaction(creoDb, onDbError, onDbOpenSuccess);
        //sincronizzaDaServer();
        //InizializzaArray();
        alert("Database azzerato. Premi Sincronizza Da Zero per ricaricare tutti i dati dal server!");
    }

    function inviaPostazioneToServer(nuovapostazione) {
        $.post( serviceURL + 'settablepostazioni.php', { id_sede:nuovapostazione.id_sede_cliente, id_servizio:nuovapostazione.id_tipo_servizio, codice_postazione:nuovapostazione.codice_postazione, nome:nuovapostazione.nome, ultimo_aggiornamento:nuova_postazione.ultimo_aggiornamento })
            .done(function( data ) {
                sincronizzaDaServer();
            });
    }

    function AggiornaSuServer() {
        //mando sul server i dati da aggiornare
        ultimoagg=global_ultimo_aggiornamento;
        if (global_ultimo_aggiornamento=='') { ultimoagg='0000-00-00'; }
        //alert("Ultimo aggiornamento:"+ultimoagg);
        //POSTAZIONI
        db.transaction(function (tx2) {
            tx2.executeSql('SELECT * FROM LOCAL_POSTAZIONI WHERE ultimo_aggiornamento>?', [ultimoagg], function (tx2, dati) {
                    var len = dati.rows.length, i;
                    if (len>0) {
                        for (i = 0; i < len; i++){
                            //alert("Postazione:"+dati.rows.item(i).codice_postazione);
                            //alert("Ultimo aggiornamento postazione:"+dati.rows.item(i).ultimo_aggiornamento);
                            var obj=dati.rows.item(i);
                            $.post( serviceURL + 'settablepostazioni.php', obj)
                                .done(function( data ) {
                                    //alert('Aggiornate Postazioni Sul Server');
                                });
                            //for (var prop in obj) {
                            //    alert("obj." + prop + " = " + obj[prop]);
                            //}
                        }
                    } else {
                        //alert("Niente postazioni locali da aggiornare");
                    }
                }, function() {
                }
            );
        });
        //VISITE
        db.transaction(function (tx2) {
            tx2.executeSql('SELECT * FROM LOCAL_VISITE WHERE ultimo_aggiornamento>?', [ultimoagg], function (tx2, dati) {
                    var len = dati.rows.length, i;
                    if (len>0) {
                        for (i = 0; i < len; i++){
                            //alert("Visita:"+dati.rows.item(i).codice_visita);
                            //alert("Ultimo aggiornamento visita:"+dati.rows.item(i).ultimo_aggiornamento);
                            var obj=dati.rows.item(i);
                            $.post( serviceURL + 'settablevisite.php', obj)
                                .done(function( data ) {
                                    //alert('Aggiornate Visite Sul Server');
                                });
                        }
                    } else {
                        //alert("Niente visite locali da aggiornare");
                    }
                }, function() {
                }
            );
        });
        //ISPEZIONI
        db.transaction(function (tx2) {
            tx2.executeSql('SELECT * FROM LOCAL_ISPEZIONI WHERE ultimo_aggiornamento>?', [ultimoagg], function (tx2, dati) {
                    var len = dati.rows.length, i;
                    if (len>0) {
                        for (i = 0; i < len; i++){
                            //alert("Ispezione:"+dati.rows.item(i).codice_ispezione);
                            //alert("Ultimo aggiornamento ispezione:"+dati.rows.item(i).ultimo_aggiornamento);
                            var obj=dati.rows.item(i);
                            $.post( serviceURL + 'settableispezioni.php', obj)
                                .done(function( data ) {
                                    //alert('Aggiornate Ispezioni Sul Server');
                                });
                        }
                    } else {
                        //alert("Niente ispezioni locali da aggiornare");
                    }
                }, function() {
                }
            );
        });
    }

    function getClientiListFromServer() {
        var iclienti=0;
        $.getJSON(serviceURL + 'gettableclienti.php?ult='+global_ultimo_aggiornamento, function (data) {
            clienti_server = data.items;
            $.each(clienti_server, function (index, cliente) {
                db.transaction(
                    function (tx) { tx.executeSql("INSERT OR REPLACE INTO SERVER_CLIENTI (id, nome_o_ragione_sociale, partita_iva, codice_fiscale, tipo, persona_di_riferimento, telefono, email, note ) VALUES (?,?,?,?,?,?,?,?,?)", [cliente.id, cliente.nome_o_ragione_sociale, cliente.partita_iva, cliente.codice_fiscale, cliente.tipo, cliente.persona_di_riferimento, cliente.telefono, cliente.email, cliente.note]); },
                    function () { alert(cliente.nome_o_ragione_sociale + " non inserito"); },
                    function () { iclienti++;$("#homeclienti").html('Clienti: '+iclienti);
                        //alert(cliente.nome_o_ragione_sociale + " inserito");
                    }
                );
            });
        });
        //setUltimoAggiornamento('getClientiListFromServer');
    }
    function getSediClientiListFromServer() {
        $.getJSON(serviceURL + 'gettablesediclienti.php?ult='+global_ultimo_aggiornamento, function (data) {
            sedi_clienti_server = data.items;
            $.each(sedi_clienti_server, function (index, cliente) {
                db.transaction(
                    function (tx) { tx.executeSql("INSERT OR REPLACE INTO SERVER_SEDI_CLIENTI (id, cliente_e_sede, sede, indirizzo, CAP, citta, provincia, persona_di_riferimento, telefono, email, note ) VALUES (?,?,?,?,?,?,?,?,?,?,?)", [cliente.id, cliente.cliente_e_sede, cliente.sede, cliente.indirizzo, cliente.CAP, cliente.citta, cliente.provincia, cliente.persona_di_riferimento, cliente.telefono, cliente.email, cliente.note]); },
                    function () { alert(cliente.cliente_e_sede + " non inserito"); },
                    function () { //alert(cliente.cliente_e_sede + " inserito");
                    }
                );
            });
        }).done(function(){
            db.transaction(function (tx) {
                tx.executeSql('SELECT * FROM SERVER_SEDI_CLIENTI', [], function (tx, results) {
                        var len = results.rows.length, i;
                        for (i = 0; i < len; i++){
                            cliente_e_sede=results.rows.item(i).cliente_e_sede;
                            id_sede=results.rows.item(i).id;
                            sedi[id_sede]=cliente_e_sede;
                            //alert("Inserisco in sede numero:"+id_sede+" sede:"+cliente_e_sede);
                        }
                    }, function() {
                    }
                );
            });
        });
        //setUltimoAggiornamento('getSediClientiListFromServer');
    }
    function getTipiServizioListFromServer() {
        $.getJSON(serviceURL + 'gettabletipiservizio.php?ult='+global_ultimo_aggiornamento, function (data) {
            tipi_servizio_server = data.items;
            $.each(tipi_servizio_server, function (index, tiposervizio) {
                db.transaction(
                    function (tx) { tx.executeSql("INSERT OR REPLACE INTO SERVER_TIPI_SERVIZIO (id, servizio, descrizione_servizio) VALUES (?,?,?)", [tiposervizio.id, tiposervizio.servizio, tiposervizio.descrizione_servizio]); },
                    function () { alert(tiposervizio.servizio + " non inserito"); },
                    function () { //alert(tiposervizio.servizio + " inserito");
                    }
                );
            });
        });
        //setUltimoAggiornamento('getTipiServizioListFromServer');
        db.transaction(function (tx) {
            tx.executeSql('SELECT * FROM SERVER_TIPI_SERVIZIO', [], function (tx, results) {
                    var len = results.rows.length, i;
                    for (i = 0; i < len; i++){
                        var id_servizio=results.rows.item(i).id;
                        descrizioniservizio[id_servizio]=results.rows.item(i).descrizione_servizio;
                        tipiservizio[id_servizio]=results.rows.item(i).servizio;
                        //alert("Inserisco in servizio numero:"+id_servizio+" tiposervizio:"+servizio+" e descrizione:"+descrizione_servizio);
                    }
                }, function() {
                }
            );
        });

    }
    function getPostazioniListFromServer() {
        $.getJSON(serviceURL + 'gettablepostazioni.php?ult='+global_ultimo_aggiornamento, function (data) {
            postazioni_server = data.items;
            $.each(postazioni_server, function (index, postazione) {
                db.transaction(
                    function (tx) { tx.executeSql("INSERT OR REPLACE INTO LOCAL_POSTAZIONI (id_sede, id_servizio, codice_postazione, nome) VALUES (?,?,?,?)", [postazione.id_sede, postazione.id_servizio, postazione.codice_postazione, postazione.nome]); },
                    function () { alert(postazione.codice_postazione + " non inserito"); },
                    function () { //alert(postazione.nome + " inserito");
                    }
                );
            });
        });
        setUltimoAggiornamento('getPostazioniListFromServer');
    }
    function getVisiteListFromServer() {
        $.getJSON(serviceURL + 'gettablevisite.php?ult='+global_ultimo_aggiornamento, function (data) {
            visite_server = data.items;
            $.each(visite_server, function (index, visita) {
                db.transaction(
                    function (tx) { tx.executeSql("INSERT OR REPLACE INTO LOCAL_VISITE (codice_visita, id_sede, id_dipendente, data_inizio_visita, data_fine_visita, stato_visita) VALUES (?,?,?,?,?,?)", [visita.codice_visita, visita.id_sede, visita.id_dipendente, visita.data_inizio_visita, visita.data_fine_visita, visita.stato_visita]); },
                    function () { alert("visita "+visita.codice_visita + " non inserita"); },
                    function () { //alert("visita "+visita.id + " inserita");
                    }
                );
            });
        });
        //setUltimoAggiornamento('getVisiteListFromServer');
    }
    function getIspezioniListFromServer() {
        $.getJSON(serviceURL + 'gettableispezioni.php?ult='+global_ultimo_aggiornamento, function (data) {
            ispezioni_server = data.items;
            $.each(ispezioni_server, function (index, isp) {
                db.transaction(
                    function (tx) { tx.executeSql("INSERT OR REPLACE INTO LOCAL_ISPEZIONI (codice_ispezione, codice_postazione, codice_visita, data_ispezione, stato_postazione, stato_esca_roditori, collocato_adescante_roditori, stato_piastra_collante_insetti_striscianti, ooteche_orientalis, adulti_orientalis, ooteche_germanica, adulti_germanica, ooteche_supella_longipalpa, adulti_supella_longipalpa, ooteche_periplaneta_americana, adulti_periplaneta_americana, stato_piastra_insetti_volanti, presenza_muscidi, presenza_imenotteri_vespidi, presenza_imenotteri_calabronidi, presenza_dittere, presenza_altri_tipi_insetti, note_per_cliente, nutrie_tana, nutrie_target, presenza_target_lepidotteri, tipo_target_lepidotteri, latitudine, longitudine, ultimo_aggiornamento) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", [isp.codice_ispezione, isp.codice_postazione, isp.codice_visita, isp.data_ispezione, isp.stato_postazione, isp.stato_esca_roditori, isp.collocato_adescante_roditori, isp.stato_piastra_collante_insetti_striscianti, isp.ooteche_orientalis, isp.adulti_orientalis, isp.ooteche_germanica, isp.adulti_germanica, isp.ooteche_supella_longipalpa, isp.adulti_supella_longipalpa, isp.ooteche_periplaneta_americana, isp.adulti_periplaneta_americana, isp.stato_piastra_insetti_volanti, isp.presenza_muscidi, isp.presenza_imenotteri_vespidi, isp.presenza_imenotteri_calabronidi, isp.presenza_dittere, isp.presenza_altri_tipi_insetti, isp.note_per_cliente, isp.nutrie_tana, isp.nutrie_target, isp.presenza_target_lepidotteri, isp.tipo_target_lepidotteri, isp.latitudine, isp.longitudine, isp.ultimo_aggiornamento]); },
                    function () { alert("ispezione "+isp.codice_ispezione + " non inserita"); },
                    function () { //alert("ispezione "+isp.id + " inserita");
                    }
                );
            });
        });
        //setUltimoAggiornamento('getIspezioniListFromServer');
    }
    function getUsersListFromServer() {
        $.getJSON(serviceURL + 'gettableusers.php?ult='+global_ultimo_aggiornamento, function (data) {
            users_server = data.items;
            $.each(users_server, function (index, user) {
                db.transaction(
                    function (tx) { tx.executeSql("INSERT OR REPLACE INTO SERVER_USERS (id, id_ruolo, PIN, Nome, Cognome, email) VALUES (?,?,?,?,?,?)", [user.id, user.id_ruolo, user.PIN, user.Nome, user.Cognome, user.email]); },
                    function () { alert("user "+user.id + " non inserito"); },
                    function () { //alert("user "+user.id + " inserito");
                    }
                );
                for (var i in users_server) {
                    var utente=users_server[i];
                    users[utente.id]=utente.nome+' '+utente.cognome;
                    //alert(cliente.id+' -> '+cliente.cliente_e_sede);
                }
            });
        });
        setUltimoAggiornamento('getUsersListFromServer');
    }

    function setUltimoAggiornamento(msg) {
        //alert(msg);
        global_ultimo_aggiornamento=getDateTime();
        db.transaction(
            function (tx) { tx.executeSql("INSERT OR REPLACE INTO LOCAL_ULTIMOAGGIORNAMENTO (id,ultimo_aggiornamento) VALUES (?,?)", [1,global_ultimo_aggiornamento]); },
            function () { alert("ultimo aggiornamento non inserito"); },
            function () { //alert("ispezione "+isp.id + " inserita");
            }
        );
        $("#ultimo_aggiornamento_content").html('Ultimo aggiornamento:<br/>'+global_ultimo_aggiornamento);
    }

    // (i) Cerca Postazione
    function cercaPostazione(){
        db.transaction(cercaPostazioneQuery);
    }

    function cercaPostazioneQuery(tx){
        tx.executeSql("SELECT * FROM LOCAL_POSTAZIONI WHERE codice_postazione=?", [scanText], onSelectPostazioneSuccess, onDbError);
    }
    function onSelectPostazioneSuccess(tx,dati) {
        len = dati.rows.length;
        postazioneCorrente.id_sede='';
        postazioneCorrente.id_servizio='';
        postazioneCorrente.nome='';
        postazioneCorrente.codice_postazione='';
        if(len!=0) {
            postazioneCorrente.id_sede = dati.rows.item(0).id_sede;
            postazioneCorrente.id_servizio=dati.rows.item(0).id_servizio;
            postazioneCorrente.nome=dati.rows.item(0).nome;
            postazioneCorrente.codice_postazione=dati.rows.item(0).codice_postazione;
            location.href="#postazione_trovata";
            return 1;
            //return dati.rows.item(0);
        } else {
            result=confirm("Postazione non presente nel database. Vuoi creare una postazione con codice: "+scanText+"?");
            if (result==1) {
                creaPostazione();
            }
            return -1;
        }
    }
    // (f) Cerca Postazione

    // (i) Cerca Postazione Visita
    function cercaPostazioneVisita(){
        db.transaction(cercaPostazioneQueryVisita);
    }

    function cercaPostazioneQueryVisita(tx){
        //alert("Cerco Postazione per Visita: "+VisitaCorrente.codice_visita+" scanText:"+scanText);
        tx.executeSql("SELECT * FROM LOCAL_ISPEZIONI JOIN LOCAL_POSTAZIONI ON LOCAL_ISPEZIONI.codice_postazione=LOCAL_POSTAZIONI.codice_postazione WHERE LOCAL_ISPEZIONI.codice_visita=? AND LOCAL_ISPEZIONI.codice_postazione=?", [VisitaCorrente.codice_visita,scanText], onSelectPostazioneVisitaSuccess, onDbError);
    }
    function onSelectPostazioneVisitaSuccess(tx,dati) {
        len = dati.rows.length;
        postazioneCorrente.id_sede='';
        postazioneCorrente.id_servizio='';
        postazioneCorrente.nome='';
        postazioneCorrente.codice_postazione='';
        if(len!=0) {
            postazioneCorrente.id_sede = dati.rows.item(0).id_sede;
            postazioneCorrente.id_servizio=dati.rows.item(0).id_servizio;
            postazioneCorrente.nome=dati.rows.item(0).nome;
            postazioneCorrente.codice_postazione=dati.rows.item(0).codice_postazione;
            postazioneCorrente.codice_ispezione=VisitaCorrente.codice_visita+"|"+postazioneCorrente.codice_postazione;
            //alert("idservizio della postazioneCorrente:"+postazioneCorrente.id_servizio);
            //alert("Vado a #ispezione"+tipiservizio[postazioneCorrente.id_servizio]);
            $(".nomecliente").html('CLIENTE: '+sedi[postazioneCorrente.id_sede]);
            $(".nomepostazione").html('Nome postazione: '+postazioneCorrente.nome);
            $(".serviziopostazione").html('Servizio: '+descrizioniservizio[postazioneCorrente.id_servizio]);
            location.href="#ispezione"+tipiservizio[postazioneCorrente.id_servizio];
            return 1;
            //return dati.rows.item(0);
        } else {

            db.transaction(function (tx2) {
                var datiRiga='';
                tx2.executeSql('SELECT * FROM LOCAL_POSTAZIONI WHERE (codice_postazione=? )', [scanText], function (tx2, dati) {
                        var len = dati.rows.length, i;
                        if (len>0) {
                            for (i = 0; i < len; i++){
                                //alert(dati.rows.item(i).codice_postazione);
                                postazioneCorrente.id_sede = dati.rows.item(0).id_sede;
                                postazioneCorrente.id_servizio=dati.rows.item(0).id_servizio;
                                postazioneCorrente.nome=dati.rows.item(0).nome;
                                postazioneCorrente.codice_postazione=dati.rows.item(0).codice_postazione;
                                var codice_ispezione=VisitaCorrente.codice_visita+"|"+postazioneCorrente.codice_postazione;
                                var codice_postazione=postazioneCorrente.codice_postazione;
                                var codice_visita=VisitaCorrente.codice_visita;
                                var ultimo_aggiornamento=getDateTime();
                                var ancora_da_visionare='Ancora da Visionare';
                                //alert("INSERT OR REPLACE INTO LOCAL_ISPEZIONI (codice_ispezione,codice_visita,codice_postazione) VALUES (?,?,?) "+"["+codice_ispezione+", "+codice_visita+","+codice_postazione+"]");

                                result=confirm("Vuoi aggiungere la postazione alla visita corrente?");
                                if (result==1) {
                                    db.transaction(
                                        function (tx3) { tx3.executeSql("INSERT OR REPLACE INTO LOCAL_ISPEZIONI (codice_ispezione,codice_visita,codice_postazione,ultimo_aggiornamento,stato_postazione) VALUES (?,?,?,?,?)", [codice_ispezione,codice_visita,codice_postazione,ultimo_aggiornamento,ancora_da_visionare]); },
                                        function () { alert("errore");
                                        },
                                        function () { alert("ispezione "+codice_ispezione+" inserita");
                                        }
                                    );

                                    var AggiornamentiIspezioni=true;
                                }
                            }
                        } else {
                            result=confirm("Postazione non presente nel database. Vuoi creare una postazione con codice: "+scanText+"?");
                            if (result==1) {
                                creaPostazione();
                            }
                        }

                    }, function() {
                        alert("Errore!");
                    }
                );
            });
        }
    }
    // (f) Cerca Postazione Visita

    // (i) Crea / Modifica Postazione
    function creaPostazione() {
        $("#sede_cliente_container").html('');
        var combo = $("<select></select>").attr("id", 'id_sede_cliente').attr("name", 'id_sede_cliente');
        combo.append("<option value='0'> -- scegli cliente -- </option>");
        for (var key in sedi) {
            combo.append("<option value='"+key+"'>" + sedi[key] + "</option>");
        }
        $("#sede_cliente_container").append(combo);

        $("#tipo_servizio_container").html('');
        var combo2 = $("<select></select>").attr("id", 'id_tipo_servizio').attr("name", 'id_tipo_servizio');
        combo2.append("<option value='0'> -- scegli tipo servizio -- </option>");

        for (var key in descrizioniservizio) {
            combo2.append("<option value='"+key+"'>" + descrizioniservizio[key] + "</option>");
        }

        $("#tipo_servizio_container").append(combo2);

        $("#nome").val('');
        $("#codice_postazione").val(scanText);
        $("#nuova_postazione").trigger("create");
        location.href="#nuova_postazione";

    }

    $("#nuovapostazione_submit").on("click", function (e) {
        e.preventDefault();
        var nuovapostazione={};
        nuovapostazione.id_sede_cliente = $("#id_sede_cliente").val();
        nuovapostazione.id_tipo_servizio=$("#id_tipo_servizio").val();
        nuovapostazione.nome=$("#nome").val();
        nuovapostazione.codice_postazione=$("#codice_postazione").val();
        nuovapostazione.ultimo_aggiornamento=getDateTime();
        errore=false;

        if (nuovapostazione.id_sede_cliente == 0) { alert("Inserisci il cliente!"); errore=true; }
        if (nuovapostazione.id_tipo_servizio == 0) { alert("Inserisci il tipo di servizio!"); errore=true; }
        if (nuovapostazione.nome == '') { alert("Inserisci il nome della postazione!"); errore=true; }

        if (errore) {

        } else {
            aggiungiPostazione(nuovapostazione);
            //inviaPostazioneToServer(nuovapostazione);
            $("#home").trigger("create");
            location.href = '#home';
        }
    });

    function aggiungiPostazione(nuovapostazione) {
        db.transaction(
            function (tx) {
                tx.executeSql("INSERT OR REPLACE INTO LOCAL_POSTAZIONI (id_sede, id_servizio, codice_postazione, nome, ultimo_aggiornamento) VALUES (?,?,?,?,?)",[nuovapostazione.id_sede_cliente, nuovapostazione.id_tipo_servizio, nuovapostazione.codice_postazione, nuovapostazione.nome, nuovapostazione.ultimo_aggiornamento]);
            },
            onDbError,
            function () {
                var AggiornamentiPostazioni=true;
            }
        );
        //ora bisogna aggiungere l'ispezione per la visita corrente, se c'è
        if (VisitaCorrente.codice_visita) {
            result=confirm("Aggiungi questa postazione alla visita corrente?");
            if (result==1) {
                var codice_ispezione=VisitaCorrente.codice_visita+"|"+nuovapostazione.codice_postazione;
                var codice_postazione=nuovapostazione.codice_postazione;
                var codice_visita=VisitaCorrente.codice_visita;
                var ultimo_aggiornamento=getDateTime();

                db.transaction(
                    function (tx3) { tx3.executeSql("INSERT OR REPLACE INTO LOCAL_ISPEZIONI (codice_ispezione,codice_visita,codice_postazione,ultimo_aggiornamento,stato_postazione) VALUES (?,?,?,?)", [codice_ispezione,codice_visita,codice_postazione,ultimo_aggiornamento,'Ancora da Visionare']); },
                    function () { //alert("errore");
                    },
                    function () { //alert("ispezione "+codice_ispezione+" inserita");
                    }
                );
            }
        }
    }

    function creaVisita(id_sede) {
        var nuovavisita={};
        nuovavisita.id_sede_cliente = id_sede;
        nuovavisita.id_dipendente=IDDIPENDENTE;
        nuovavisita.data_inizio_visita=today;
        nuovavisita.codice_visita=todayMySql+'|'+IDDIPENDENTE+'|'+id_sede;
        var ultimo_aggiornamento=getDateTime();

        db.transaction(
            function (tx) {
                tx.executeSql("INSERT INTO LOCAL_VISITE (codice_visita, id_sede, id_dipendente, data_inizio_visita, stato_visita, ultimo_aggiornamento) VALUES (?,?,?,?,?,?)",[nuovavisita.codice_visita, nuovavisita.id_sede_cliente, nuovavisita.id_dipendente, todayMySql, 'in_corso',ultimo_aggiornamento]);
            },
            onDbError,
            function () {
                //alert("visita inserita localmente, ora devo mettere le ispezioni");
                var AggiornamentiVisite=true;
                //faccio un ciclo su tutte le postazioni della sede, creo il codice_ispezione e inserisco l'ispezione in locale

                db.transaction(function (tx2) {
                    var datiRiga='';
                    tx2.executeSql('SELECT * FROM LOCAL_POSTAZIONI WHERE (id_sede=? )', [id_sede], function (tx2, dati) {
                            var len = dati.rows.length, i;
                            var rigaselect;
                            if (len>0) {
                                alert("Ci sono "+len+" postazioni da inserire nella visita di oggi");
                                for (i = 0; i < len; i++){

                                    var codice_ispezione=nuovavisita.codice_visita+"|"+dati.rows.item(i).codice_postazione;
                                    var codice_postazione=dati.rows.item(i).codice_postazione;
                                    var codice_visita=nuovavisita.codice_visita;
                                    var ultimo_aggiornamento=getDateTime();
                                    var ancora_da_visionare='Ancora da Visionare';

                                    if (i==0) {
                                        rigaselect="INSERT INTO LOCAL_ISPEZIONI (codice_ispezione,codice_visita,codice_postazione,ultimo_aggiornamento,stato_postazione) SELECT '"+codice_ispezione+"' AS codice_ispezione, '"+codice_visita+"' AS codice_visita, '"+codice_postazione+"' as codice_postazione, '"+ultimo_aggiornamento+"' AS ultimo_aggiornamento,'"+ancora_da_visionare+"' AS stato_postazione ";
                                    } else {
                                        rigaselect+=" UNION ALL SELECT '"+codice_ispezione+"','"+codice_visita+"','"+codice_postazione+"','"+ultimo_aggiornamento+"','"+ancora_da_visionare+"'";
                                    }
                                    var AggiornamentiIspezioni=true;
                                }
                                alert(rigaselect);
                                db.transaction(
                                    function (tx3) { tx3.executeSql(rigaselect); },
                                    function () { alert("errore inserimento ");
                                    },
                                    function () { alert("ispezioni inserite");
                                    }
                                );
                            } else {
                                alert("Nessuna postazione, c'è qualcosa che non va!");
                            }

                        }, function() {
                            alert("Errore!");
                        }
                    );
                });
                //inviaVisitaToServer(nuovavisita);
            }
        );


        /*        var Connessione=checkConnessione();
         if (Connessione) {
         $.post( serviceURL + 'settablevisite.php', { codice_visita:nuovavisita.codice_visita,id_sede:nuovavisita.id_sede_cliente, id_dipendente:nuovavisita.id_dipendente, data_inizio_visita:todayMySql })
         .done(function( data ) {
         alert( "Visita aggiunta al server" );
         sincronizzaDaServer();
         });

         } else {
         alert("Sono senza connessione, devo aggiungere visita in locale!");
         }
         */
        location.href = '#home';

    }
    /*
     function aggiungiVisita(nuovavisita) {
     db.transaction(
     function (tx) {
     tx.executeSql("INSERT INTO LOCAL_VISITE (id_sede,id_master, id_dipendente, data_inizio_visita, data_fine_visita) VALUES (?,?,?,?,?)", [nuovavisita.id_sede_cliente, '0', nuovavisita.id_dipendente, nuovavisita.data_inizio_visita, '00/00/0000'])
     tx.executeSql("SELECT last_insert_rowid() as lastinsertid",[], onSelectLastInsertID, onDbError);
     },
     onDbError,
     function () {
     var AggiornamentiPostazioni=true;
     alert("Postazione inserita");
     }
     );
     }
     */


    //---------------------------------------------------------------------------------------
    // (f) GLOBALI
    //---------------------------------------------------------------------------------------

    $("#getPosizione").on('click',function(){
        getPosizione();
    });

    $("#pulisciDb").on( "click", function(){
        db.transaction(pulisciDataBase, onDbError, onDbClearSuccess);
    });

    $("#sincronizza").on( "click", function(){
        sincronizzaDaServer();
    });
    $("#sincronizza_zero").on( "click", function(){
        global_ultimo_aggiornamento="0000-00-00";
        sincronizzaDaServer();
        InizializzaArray();
    });

    $("#elencoclienti").on( "click", function(){
        //alert("Eccomi qui");
        for (var key in sedi) {
            alert(key+">" + sedi[key]);
        }

    });

    //$("#postazione_trovata_visita").on('click',function(){
    //    location.href="#ispezioneA2";
    //});

    $("#SCAN").on('click',function(){
        scanCode();
    });
    $("#SCAN_VISITA").on('click',function(){
        scanCodeVisita();
    });
    $("#FINE_VISITA").on('click',function(){
        db.transaction(function (tx) {
            //alert("Visita corrente:"+VisitaCorrente.codice_visita);
            tx.executeSql('SELECT * FROM LOCAL_ISPEZIONI JOIN LOCAL_POSTAZIONI ON LOCAL_POSTAZIONI.codice_postazione=LOCAL_ISPEZIONI.codice_postazione WHERE (codice_visita=? AND stato_postazione="Ancora da Visionare")', [VisitaCorrente.codice_visita], function (tx, dati) {
                    var len = dati.rows.length, i;
                    var datiRiga='';
                    if (len>0) {
                        for (i = 0; i < len; i++){
                            //datiRiga+="<a href='#singola_visita?id="+dati.rows.item(i).codice_visita+"'><button data-theme='f'> Visita del "+dati.rows.item(i).data_inizio_visita+"</button></a>";
                            //datiRiga+='<li><a class="singola_visita_link" href="#singola_visita?id='+dati.rows.item(i).id_locale+'">'+dati.rows.item(i).data_inizio_visita+'</a></li>';
                            alert("Ancora da visionare: "+dati.rows.item(i).nome);
                            //datiRiga+="<a href='#postazione_mancante?id="+dati.rows.item(i).codice_ispezione+"'><button data-theme='f'> "+dati.rows.item(i).nome+"</button></a>";
                        }
                        //$("#postazionimancanti_list").html('<h4>Ancora da visionare</h4>');
                        //$("#postazionimancanti_list").append(datiRiga);
                        //$("#postazione_mancante").trigger("create");
                    } else {
                        alert("OK! Tutte le postazioni sono state visitate! Compila il modulo del certificato!");
                        //devo fare l'update su visite e poi chiamare genera certificati
                        location.href="#fine_visita";
                    }

                }, function() {
                    alert("Errore!");
                }
            );
        });
    });
    function scanCode() {

        try {
            cordova.plugins.barcodeScanner.scan(
                function (result) {
                    //alert("We got a barcode\n" +
                    //    "Result: " + result.text + "\n" +
                    //    "Format: " + result.format + "\n" +
                    //    "Cancelled: " + result.cancelled);
                    scanText=result.text;
                    if (scanText=='') {

                    } else {
                        ProcessaScanText();
                    }
                    //alert(scanText);
                },
                function (error) {
                    alert("Scanning failed: " + error);
                }
            );
        }
        catch(err) {
            //per fare il debug tramite phonegap app developer invece che per forza con la app
            scanText="FABFRA001";
            ProcessaScanText();
        }

    }
    function scanCodeVisita() {

        try {
            cordova.plugins.barcodeScanner.scan(
                function (result) {
                    scanText=result.text;
                    if (scanText=='') {

                    } else {
                        ProcessaScanTextVisita();
                    }
                    //alert(scanText);
                },
                function (error) {
                    alert("Scanning failed: " + error);
                }
            );
        }
        catch(err) {
            //per fare il debug tramite phonegap app developer invece che per forza con la app
            scanText="FABFRA001";
            ProcessaScanTextVisita();
        }

    }

    function ProcessaScanText() {
        //controllo che il testo del qrcode corrisponda ad una trappola
        cercaPostazione();
    }
    function ProcessaScanTextVisita() {
        //controllo che il testo del qrcode corrisponda ad una trappola
        cercaPostazioneVisita();
    }

    $(document).on("pagebeforeshow","#postazione_trovata",function(){ // When entering pagetwo
        $("#postazione_trovata_cliente").html(sedi[postazioneCorrente.id_sede]);
        $("#postazione_trovata_tipo_servizio").html('('+tipiservizio[postazioneCorrente.id_servizio]+') '+descrizioniservizio[postazioneCorrente.id_servizio]);
        $("#postazione_trovata_nome").html('nome postazione: '+postazioneCorrente.nome);
        $("#postazione_trovata_CodicePostazione").html('codice postazione: '+postazioneCorrente.codice_postazione);
        db.transaction(function (tx) {
            var datiRiga='';
            tx.executeSql('SELECT * FROM LOCAL_VISITE WHERE (id_sede=? AND stato_visita="in_corso")', [postazioneCorrente.id_sede], function (tx, dati) {
                    var len = dati.rows.length, i;
                    if (len>0) {
                        for (i = 0; i < len; i++){
                            datiRiga+="<a href='#singola_visita?id="+dati.rows.item(i).codice_visita+"'><button data-theme='f'> Visita del "+dati.rows.item(i).data_inizio_visita+"</button></a>";
                            //datiRiga+='<li><a class="singola_visita_link" href="#singola_visita?id='+dati.rows.item(i).id_locale+'">'+dati.rows.item(i).data_inizio_visita+'</a></li>';
                        }
                        $("#postazione_trovata_visite_list").html('');
                        $("#postazione_trovata_visite_list").append(datiRiga);
                        $("#postazione_trovata").trigger("create");
                    } else {
                        result=confirm("Nessuna visita in corso. Vuoi creare una visita per oggi?");
                        if (result==1) {
                            creaVisita(postazioneCorrente.id_sede);
                        }
                    }

                }, function() {
                    alert("Errore!");
                }
            );
        });
    });

    $(document).on("pagebeforeshow","#postazione_mancante",function(){ // When entering pagetwo
        if ($.mobile.pageData && $.mobile.pageData.id){
            var codicepostazione=$.mobile.pageData.id;
            PostazioneCorrente.codice_postazione=codicepostazione;
            //alert("codicevisita= "+codicevisita);
            db.transaction(function (tx) {
                tx.executeSql('SELECT * FROM LOCAL_POSTAZIONI WHERE codice_postazione=? ', [codicepostazione], function (tx, dati) {
                        var len = dati.rows.length;
                        PostazioneCorrente.codice_ispezione=dati.rows.item(0).codice_ispezione;
                        PostazioneCorrente.id_sede=dati.rows.item(0).id_sede;
                        PostazioneCorrente.id_servizio=dati.rows.item(0).id_servizio;
                        PostazioneCorrente.nome=dati.rows.item(0).nome;
                    }, function() {
                        //alert("getVisitaCorrente: Errore DB!");
                    }
                );
            });
        }
        $("#postazione_mancante_cliente").html(sedi[postazioneCorrente.id_sede]);
        $("#postazione_mancante_tipo_servizio").html('('+tipiservizio[postazioneCorrente.id_servizio]+') '+descrizioniservizio[postazioneCorrente.id_servizio]);
        $("#postazione_mancante_nome").html('nome postazione: '+postazioneCorrente.nome);
        $("#postazione_mancante_CodicePostazione").html('codice postazione: '+postazioneCorrente.codice_postazione);
        $("#postazione_mancante").trigger("create");
    });

    $(document).on("pagebeforeshow", "#singola_visita", function(e, data){
        if ($.mobile.pageData && $.mobile.pageData.id){
            var codicevisita=$.mobile.pageData.id;
            VisitaCorrente.codice_visita=codicevisita;
            //alert("codicevisita= "+codicevisita);
            db.transaction(function (tx) {
                tx.executeSql('SELECT * FROM LOCAL_VISITE WHERE codice_visita=? ', [codicevisita], function (tx, dati) {
                        var len = dati.rows.length;
                        VisitaCorrente.id_sede=dati.rows.item(0).id_sede;
                        VisitaCorrente.data_inizio_visita=dati.rows.item(0).data_inizio_visita;
                        $("#singola_visita_cliente").html(sedi[VisitaCorrente.id_sede]);
                        $("#singola_visita_data_inizio").html(VisitaCorrente.data_inizio_visita);

                    }, function() {
                        //alert("getVisitaCorrente: Errore DB!");
                    }
                );
            });

            db.transaction(function (tx) {
                tx.executeSql('SELECT * FROM LOCAL_ISPEZIONI WHERE codice_visita=?', [codicevisita], function (tx, dati) {
                        var len = dati.rows.length, i;
                        var viste=0;
                        var totali=0;
                        for (i = 0; i < len; i++){
                            if (dati.rows.item(i).stato_postazione=='Ancora da Visionare') {

                            } else {
                                viste=viste+1;
                            }
                            totali=totali+1;
                        }
                        VisitaCorrente.viste=viste;
                        VisitaCorrente.totali=totali;
                        var daVedere=VisitaCorrente.totali-VisitaCorrente.viste;
                        $("#singola_visita_conto_postazioni_totali").html("Tutte le postazioni : "+VisitaCorrente.totali);
                        $("#singola_visita_conto_postazioni_davedere").html("Postazioni da vedere: "+daVedere);

                    }, function() {
                        alert("Nessuna ispezione in questa visita!");
                    }
                );
            });

            $("#singola_visita").trigger("create");

        } else {
            //alert("Visita non definita!");
        }
    });


    $(document).on("pagebeforeshow","#fine_visita",function(){
        if($('#fcmsig').find('.jSignature').length == 0){
            $('#fcmsig').jSignature({'UndoButton':false,color:"#000000",lineWidth:1});
        }
        $('#fine_visita').trigger("create");
    });

    function InizializzaArray() {
        sedi.length=0;
        db.transaction(function (tx) {
            tx.executeSql('SELECT * FROM SERVER_SEDI_CLIENTI', [], function (tx, results) {
                    var len = results.rows.length, i;
                    for (i = 0; i < len; i++){
                        cliente_e_sede=results.rows.item(i).cliente_e_sede;
                        id_sede=results.rows.item(i).id;
                        sedi[id_sede]=cliente_e_sede;
                        //alert("Inserisco in sede numero:"+id_sede+" sede:"+cliente_e_sede);
                    }
                }, function() {
                }
            );
        });
        db.transaction(function (tx) {
            descrizioniservizio.length=0;
            tipiservizio.length=0;
            tx.executeSql('SELECT * FROM SERVER_TIPI_SERVIZIO', [], function (tx, results) {
                    var len = results.rows.length, i;
                    for (i = 0; i < len; i++){
                        var id_servizio=results.rows.item(i).id;
                        descrizioniservizio[id_servizio]=results.rows.item(i).descrizione_servizio;
                        tipiservizio[id_servizio]=results.rows.item(i).servizio;
                        //alert("Inserisco in servizio numero:"+id_servizio+" tiposervizio:"+servizio+" e descrizione:"+descrizione_servizio);
                    }
                }, function() {
                }
            );
        });
    }

    //---------------------------------------------------------------------------------------
    // (i) Ispezioni
    //---------------------------------------------------------------------------------------

    $("#a1-SALVA").on('click',function(e){
        e.preventDefault();
        var ultimo_aggiornamento=getDateTime();
        var comando=[];
        var dataArray = $("#FORMispezioneA1").serializeArray(),
            len = dataArray.length,
            dataObj = {};
        for (i=0; i<len; i++) {
            var res = dataArray[i].name.replace("A1_", "");
            dataObj[res] = dataArray[i].value;
            comando[i]=res+"='"+dataArray[i].value+"'";
            //alert(dataArray[i].name+"->"+dataArray[i].value);
        }
        //controllo campi obbligatori
        if (dataObj['stato_postazione'] && dataObj['stato_esca_roditori'] && dataObj['collocato_adescante_roditori']) {
            var stringacomando=comando.join(", ");
            //alert(stringacomando);
            db.transaction(
                function (tx3) { tx3.executeSql("UPDATE LOCAL_ISPEZIONI SET "+stringacomando+",data_ispezione='"+ultimo_aggiornamento+"',ultimo_aggiornamento='"+ultimo_aggiornamento+"' WHERE codice_ispezione=?", [postazioneCorrente.codice_ispezione]); },
                function () { alert("errore");
                },
                function () {
                    AggiornaSuServer();
                    location.href="#singola_visita?id="+VisitaCorrente.codice_visita;
                    //alert("ispezione "+postazioneCorrente.codice_ispezione+" aggiornata");
                }
            );
        } else {
            alert("Inserisci tutti i campi!")
        }
    });

    $("#a2-SALVA").on('click',function(e){
        e.preventDefault();
        var ultimo_aggiornamento=getDateTime();
        var comando=[];
        var dataArray = $("#FORMispezioneA2").serializeArray(),
            len = dataArray.length,
            dataObj = {};
        for (i=0; i<len; i++) {
            var res = dataArray[i].name.replace("A2_", "");
            dataObj[res] = dataArray[i].value;
            comando[i]=res+"='"+dataArray[i].value+"'";
            //alert(dataArray[i].name+"->"+dataArray[i].value);
        }
        //controllo campi obbligatori
        if (dataObj['stato_postazione'] && dataObj['stato_esca_roditori'] && dataObj['collocato_adescante_roditori']) {
            var stringacomando=comando.join(", ");
            //alert(stringacomando);
            db.transaction(
                function (tx3) { tx3.executeSql("UPDATE LOCAL_ISPEZIONI SET "+stringacomando+",data_ispezione='"+ultimo_aggiornamento+"',ultimo_aggiornamento='"+ultimo_aggiornamento+"' WHERE codice_ispezione=?", [postazioneCorrente.codice_ispezione]); },
                function () { alert("errore");
                },
                function () {
                    AggiornaSuServer();
                    location.href="#singola_visita?id="+VisitaCorrente.codice_visita;
                    //alert("ispezione "+postazioneCorrente.codice_ispezione+" aggiornata");
                }
            );
        } else {
            alert("Inserisci tutti i campi!")
        }
    });

    $("#b-SALVA").on('click',function(e){
        e.preventDefault();
        var ultimo_aggiornamento=getDateTime();
        var comando=[];
        var dataArray = $("#FORMispezioneB").serializeArray(),
            len = dataArray.length,
            dataObj = {};
        for (i=0; i<len; i++) {
            var res = dataArray[i].name.replace("B_", "");
            dataObj[res] = dataArray[i].value;
            comando[i]=res+"='"+dataArray[i].value+"'";
            //alert(dataArray[i].name+"->"+dataArray[i].value);
        }
        //controllo campi obbligatori
        if (dataObj['stato_postazione'] && dataObj['stato_esca_roditori'] && dataObj['collocato_adescante_roditori'] && dataObj['stato_piastra_collante_insetti_striscianti']) {
            var stringacomando=comando.join(", ");
            //alert(stringacomando);
            db.transaction(
                function (tx3) { tx3.executeSql("UPDATE LOCAL_ISPEZIONI SET "+stringacomando+",data_ispezione='"+ultimo_aggiornamento+"',ultimo_aggiornamento='"+ultimo_aggiornamento+"' WHERE codice_ispezione=?", [postazioneCorrente.codice_ispezione]); },
                function () { alert("errore");
                },
                function () {
                    AggiornaSuServer();
                    location.href="#singola_visita?id="+VisitaCorrente.codice_visita;
                    //alert("ispezione "+postazioneCorrente.codice_ispezione+" aggiornata");
                }
            );
        } else {
            alert("Inserisci tutti i campi!")
        }
    });

    $("#c-SALVA").on('click',function(e){
        e.preventDefault();
        var ultimo_aggiornamento=getDateTime();
        var comando=[];
        var dataArray = $("#FORMispezioneC").serializeArray(),
            len = dataArray.length,
            dataObj = {};
        for (i=0; i<len; i++) {
            var res = dataArray[i].name.replace("C_", "");
            dataObj[res] = dataArray[i].value;
            comando[i]=res+"='"+dataArray[i].value+"'";
            //alert(dataArray[i].name+"->"+dataArray[i].value);
        }
        //controllo campi obbligatori
        if (dataObj['stato_postazione'] && dataObj['stato_piastra_insetti_volanti']) {
            var stringacomando=comando.join(", ");
            //alert(stringacomando);
            db.transaction(
                function (tx3) { tx3.executeSql("UPDATE LOCAL_ISPEZIONI SET "+stringacomando+",data_ispezione='"+ultimo_aggiornamento+"',ultimo_aggiornamento='"+ultimo_aggiornamento+"' WHERE codice_ispezione=?", [postazioneCorrente.codice_ispezione]); },
                function () { alert("errore");
                },
                function () {
                    AggiornaSuServer();
                    location.href="#singola_visita?id="+VisitaCorrente.codice_visita;
                    //alert("ispezione "+postazioneCorrente.codice_ispezione+" aggiornata");
                }
            );
        } else {
            alert("Inserisci tutti i campi!")
        }
    });

    $("#e-SALVA").on('click',function(e){
        e.preventDefault();
        var ultimo_aggiornamento=getDateTime();
        var comando=[];
        var dataArray = $("#FORMispezioneE").serializeArray(),
            len = dataArray.length,
            dataObj = {};
        for (i=0; i<len; i++) {
            var res = dataArray[i].name.replace("E_", "");
            dataObj[res] = dataArray[i].value;
            comando[i]=res+"='"+dataArray[i].value+"'";
            alert(dataArray[i].name+"->"+dataArray[i].value);
        }
        //controllo campi obbligatori
        if (dataObj['stato_postazione'] && dataObj['presenza_target_lepidotteri']) {
            var stringacomando=comando.join(", ");
            //alert(stringacomando);
            db.transaction(
                function (tx3) { tx3.executeSql("UPDATE LOCAL_ISPEZIONI SET "+stringacomando+",data_ispezione='"+ultimo_aggiornamento+"',ultimo_aggiornamento='"+ultimo_aggiornamento+"' WHERE codice_ispezione=?", [postazioneCorrente.codice_ispezione]); },
                function () { alert("errore");
                },
                function () {
                    AggiornaSuServer();
                    location.href="#singola_visita?id="+VisitaCorrente.codice_visita;
                    //alert("ispezione "+postazioneCorrente.codice_ispezione+" aggiornata");
                }
            );
        } else {
            alert("Inserisci tutti i campi!")
        }
    });
    //---------------------------------------------------------------------------------------
    // (f) Ispezioni
    //---------------------------------------------------------------------------------------

    $("#PM-SALVA").on('click',function(e){
        e.preventDefault();
        var ultimo_aggiornamento=getDateTime();
        var comando=[];
        var dataArray = $("#FORMpostazionemancante").serializeArray(),
            len = dataArray.length,
            dataObj = {};
        for (i=0; i<len; i++) {
            dataObj[dataArray[i].name] = dataArray[i].value;
        }
        //controllo campi obbligatori
        if (dataObj['PM_stato_postazione']) {
            db.transaction(
                function (tx3) { tx3.executeSql("UPDATE LOCAL_ISPEZIONI SET stato_postazione="+dataObj['PM_stato_postazione']+",data_ispezione='"+ultimo_aggiornamento+"',ultimo_aggiornamento='"+ultimo_aggiornamento+"' WHERE codice_ispezione=?", [postazioneCorrente.codice_ispezione]); },
                function () { alert("errore");
                },
                function () {
                    AggiornaSuServer();
                    location.href="#singola_visita?id="+VisitaCorrente.codice_visita;
                    //alert("ispezione "+postazioneCorrente.codice_ispezione+" aggiornata");
                }
            );
        } else {
            alert("Inserisci tutti i campi!")
        }
    });


    //---------------------------------------------------------------------------------------
    // (i) Fine Visita
    //---------------------------------------------------------------------------------------

    $("#FINEVISITA-SALVA").on('click',function(e){
        e.preventDefault();
        //alert("visitacorrente:"+VisitaCorrente.codice_visita);
        var ultimo_aggiornamento=getDateTime();
        var comando=[];
        var dataArray = $("#finevisitaFORM").serializeArray(),
            len = dataArray.length,
            dataObj = {};
        for (i=0; i<len; i++) {
            if (dataArray[i].value=='on') {
                dataArray[i].value=1;
            }
            dataObj[dataArray[i].name] = dataArray[i].value;
            comando[i]=dataArray[i].name+"='"+dataArray[i].value+"'";
            //alert(dataArray[i].name+"->"+dataArray[i].value);
        }
        //controllo campi obbligatori
        if (dataObj['nome_cliente_firma']) {
            //var firmacliente=$('#fcmsig').jSignature("getData");

            try {
                navigator.camera.getPicture(function(data){
                    firmacliente="data:image/jpeg;base64,"+data;
                    alert("Dentro:"+firmacliente);
                },null,{
                    correctOrientation: true,
                    destinationType : Camera.DestinationType.DATA_URL,
                    sourceType : Camera.PictureSourceType.CAMERA,
                    quality : 50,
                    encodingType : Camera.EncodingType.JPEG
                });
            } catch (err) {
                alert("Errore uso fotocamera");
                return 1;
            }

            alert("fuori:"+firmacliente);

            //alert(firmacliente);
            var stringacomando=comando.join(", ");
            //alert(stringacomando);
            db.transaction(
                function (tx3) { tx3.executeSql("UPDATE LOCAL_VISITE SET "+stringacomando+",firma_cliente='"+firmacliente+"',data_inizio_visita=data_inizio_visita,stato_visita='conclusa',data_fine_visita='"+ultimo_aggiornamento+"',ultimo_aggiornamento='"+ultimo_aggiornamento+"' WHERE codice_visita=?", [VisitaCorrente.codice_visita]); },
                function () { alert("errore");
                },
                function () {
                    AggiornaSuServer();
                    location.href="#home";
                    //alert("ispezione "+postazioneCorrente.codice_ispezione+" aggiornata");
                }
            );
        } else {
            alert("Inserisci tutti i campi!")
        }
    });
    //---------------------------------------------------------------------------------------
    // (f) Fine Visita
    //---------------------------------------------------------------------------------------



    //---------------------------------------------------------------------------------------
    // (i) Init
    //---------------------------------------------------------------------------------------

    var success='';
    var error='';
    db = window.openDatabase("LASAETTADB", "1.0", "Database La Saetta", 200000);
    try {
        db.transaction(function (tx) {
            tx.executeSql('SELECT * FROM LOCAL_ULTIMOAGGIORNAMENTO', [], function (tx, results) {
                    var len = results.rows.length, i;
                    for (i = 0; i < len; i++){
                        global_ultimo_aggiornamento=results.rows.item(i).ultimo_aggiornamento;
                        sincronizzaDaServer();
                        InizializzaArray();
                        //alert ("ultimoaggiornamento in db: "+global_ultimo_aggiornamento);
                    }
                }, function() {
                    alert("Creo db");
                    db.transaction(creoDb, onDbError, onDbOpenSuccess);
                    sincronizzaDaServer();
                    InizializzaArray();
                }
            );
        });
    }
    catch(err) {
        alert("ERRORE: Non esiste il db!");
        //aproDatabase();
        //sincronizzaDaServer();
    }

    //aproDatabase();
    //checkDb();
    //sincronizzaDaServer();

    //---------------------------------------------------------------------------------------
    // (f) Init
    //---------------------------------------------------------------------------------------
}

