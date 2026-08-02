package run

import (
	"log"
	"net/http"
	"os"
)

func HTTP(defaultPort string, h http.Handler) {
	p := os.Getenv("PORT")
	if p == "" {
		p = defaultPort
	}
	log.Printf("listening on :%s", p)
	log.Fatal(http.ListenAndServe(":"+p, h))
}
