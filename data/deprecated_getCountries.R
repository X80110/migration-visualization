library(tidyverse)
library(countrycode)
dd <- read.csv("data/Flow Datn_name.csv") %>%
    summarize(origin_name,originregion_name,origin_iso) %>%
    unique()


x <- c('Afaganisitani', 'Barbadas', 'Sverige', 'UK')
countryname(x)
countryname(x, destination = 'iso3c')
x
origin_name <- dd%>% as.data.frame()

aa["code"]<-countrycode(dd[,1], 'country.name', 'iso3c')
aa
ff <- read.csv.("data/country_metadata-flags.csv")
ff
# dda <- read.csv("data/gf_od.csv") %>%
#     summarize(orig) %>%
#     unique() %>%
#     group_by(orig)
# dda    
# length(dda$orig)
write.csv(dd,"country-metadata.csva for Online Viz Version2.csv",header=T)
names(dd)
# dd2 <- dd %>% 
#     group_by(origin_iso,originregio")

