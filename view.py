from os import path as op

import tornado.web
import tornadio
import tornadio.router
import tornadio.server

import lib.mobwrite_daemon as mobwrite_daemon
mobwrite_core = mobwrite_daemon.mobwrite_core

ROOT = op.dirname(__file__)

class HomeHandler(tornado.web.RequestHandler):
    def get(self):
        self.render('templates/editorio.html')

class MWConnection(tornadio.SocketConnection):
    # Class level variable
    res = ""
    participants = set()
    mw = mobwrite_daemon.DaemonMobWrite()

    def on_open(self, *args, **kwargs):
        self.participants.add(self)

    def on_message(self, msg):
        if self not in self.participants:
            self.participants.add( self )

        if "mw" in msg:
            respond = self.on_mw_request( msg["mw"] )
            self.send(respond)
            #self.ping_users()
    
    def on_mw_request(self, msg):
        delta = "POST\n%s" % str(msg) #modwrite expects POST header
        respond = self.mw.handleRequest(delta)
        return respond

    def on_close(self):
        self.participants.remove(self)

    def broadcast(self, msg, to ):
        map(self.send( msg ), to )
    
    @property
    def other_participants(self):
        return filter( lambda p: p is not self, self.participants )

    def ping_users(self):
        self.broadcast( {"ping":"pong"}, self.other_participants )

    


#use the routes classmethod to build the correct resource
MWRouter = tornadio.get_router(MWConnection)

#configure the Tornado application
application = tornado.web.Application(
    [(r"/", HomeHandler), MWRouter.route()],
    flash_policy_port = 843,
    flash_policy_file = op.join(ROOT, 'flashpolicy.xml'),
    socket_io_port = 8011,
    #
    static_path= op.join(ROOT, "static"),
    debug= 1,
)

if __name__ == "__main__":
    import logging
    mobwrite_core.logging.basicConfig()
    mobwrite_core.CFG.initConfig(mobwrite_daemon.ROOT_DIR
                                 + "/mobwrite_config.txt")
    logging.getLogger().setLevel(logging.DEBUG)
    tornadio.server.SocketServer(application)
    mobwrite_core.logging.shutdown()