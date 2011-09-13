from os import path as op

import tornadio.router
import tornadio.server

import lib.mobwrite_daemon as mobwrite_daemon
mobwrite_core = mobwrite_daemon.mobwrite_core

ROOT = op.dirname(__file__)

mobwrite_core.logging.basicConfig()
mobwrite_core.CFG.initConfig(mobwrite_daemon.ROOT_DIR
                             + "/mobwrite_config.txt")


class MWConnection(tornadio.SocketConnection):
    # Class level variables
    participants = set()
    resources = {}

    def on_open(self, *args, **kwargs):
        self.participants.add(self)

    def on_message(self, msg):
        
        if "mw" in msg:
            respond = self.on_mw_request( msg )
            self.send({"mw":respond, "res":msg["res"] })
    
    def on_mw_request(self, msg):
        res = msg.get("res")
        # if there is not mobrite initilalize it
        if res not in self.resources:
            self.resources[res] = mobwrite_daemon.DaemonMobWrite()

        delta = "POST\n%s" % str(msg["mw"]) #modwrite expects POST header
        return self.resources[res].handleRequest(delta)

    def on_close(self):
        self.participants.remove(self)
        self.cleanup_resorces()

    def broadcast(self, msg, to ):
        map(self.send( msg ), to )
    
    def cleanup_resorces(self, res=None):
        map( lambda r: r.do_cleanup(), self.resources.values() )
    
    @property
    def other_participants(self):
        return filter( lambda p: p is not self, self.participants )
        

    def ping_users(self):
        self.broadcast( {"ping":"pong"}, self.other_participants )

    


#use the routes classmethod to build the correct resource
MWRouter = tornadio.get_router(MWConnection, resource="mw")