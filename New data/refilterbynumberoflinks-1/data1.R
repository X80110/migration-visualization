##
## data1: json for flows
## data2: json for flows by sex
## data3: json for flows by type
## data4: json for stocks
## data5: json for stocks by sex
##

library(tidyverse)
library(countrycode)
library(migest)
library(jsonlite)

f <- read_csv("..\\global-bilat-flow-sex\\est\\bilat_mig.csv")
# f <- read_csv("..\\global-bilat-flow-sex\\est-v04\\bilat_mig.csv")
# f <- read_csv("https://ndownloader.figshare.com/files/26239945")

d0 <- f %>%
  mutate(
    orig_area = countrycode(
      sourcevar = orig, custom_dict = dict_ims,
      origin = "iso3c", destination = "region_ac2022"),
    dest_area = countrycode(
      sourcevar = dest, custom_dict = dict_ims,
      origin = "iso3c", destination = "region_ac2022")) %>%
  pivot_longer(cols = 4:9, names_to = "method", values_to = "flow")

d1 <- d0 %>%
  group_by(method, year0) %>%
  sum_expand(guess_order = TRUE, return_matrix = FALSE)

# in some periods there are no estimates for some countries (e.g Serbia pre 2010, 
# or serbia and monetenegro (combined) after 2010)

# expand data frame to get consistent dimensions over all periods
d2 <- d1 %>%
  ungroup() %>%
  complete(orig, dest, year0, method, fill = list(flow = 0))
tail(d2)

# order of regions and countries, following latest plots
n0 <- unique(dict_ims$region_ac2022) %>%
  .[c(1, 2, 8, 3, 7, 6, 4, 5, 11, 9, 10)]

n1 <- tibble(lab0 = unique(d1$orig)) %>%
  mutate(area = ifelse(str_length(lab0) > 3, lab0, NA),
         lab1 = countrycode(sourcevar = lab0, custom_dict = dict_ims,
                             origin = "iso3c", destination = "name_short"),
         lab1 = stringi::stri_trans_general(str = lab1, id = "latin-ascii")) %>%
  fill(area) %>%
  mutate(area = factor(area, levels = n0)) %>%
  arrange(area, lab1) %>%
  mutate(lab1 = ifelse(is.na(lab1), as.character(area), lab1)) %>%
  group_by(area) %>%
  nest() %>%
  mutate(d = map(.x = data, .f = ~slice(.x, n(), 1:(n()-1)))) %>%
  select(-data) %>%
  unnest(d) %>%
  ungroup() %>%
  mutate(flag = countrycode(sourcevar = lab0, origin = "iso3c", destination = "unicode.symbol"))

tail(n1)

# totals
d3a <- d1 %>%
  filter(orig %in% n0,
         dest %in% n0) %>%
  group_by(year0, method) %>%
  sum_country() %>%
  select(-turn, -net) %>%
  ungroup()

d3b <- d1 %>%
  filter(!orig %in% n0,
         !dest %in% n0) %>%
  group_by(year0, method) %>%
  sum_country() %>%
  select(-turn, -net) %>%
  ungroup() %>%
  mutate(
    country = countrycode(sourcevar = country, custom_dict = dict_ims,
                       origin = "iso3c", destination = "name_short"),
    country = stringi::stri_trans_general(str = country, id = "latin-ascii")
  )
  
d3 <- d3a %>%
  bind_rows(d3b) %>%
  mutate(country = factor(country, levels = n1$lab1)) %>%
  arrange(country) 

# json components  
# area ids
a <- which(n1$area == n1$lab1)
# names
n <- n1$lab1
# matrices
m <- d2 %>% 
  mutate(orig = factor(orig, levels = n1$lab0), 
         dest = factor(dest, levels = n1$lab0)) %>%
  arrange(method, year0, orig, dest) %>%
  xtabs(formula = round(flow) ~ orig + dest + method + year0, data = .,) %>%
  array_tree(margin = c(3, 4))
# dimension names will be lost when save as json
str(m)

# threshold
d0 %>%
  # filter(flow > 0) %>%
  group_by(method) %>%
  summarise(n100 = sum(flow>100),
            n1000 = sum(flow>1000),
            n10000 = sum(flow>10000),
            n50000  = sum(flow>50000))

# colours  
p <- colorRampPalette(migest::umbrella)(length(a))
pie(rep(1, length(a)), col = p)

x <- names(m)
for(i in 1:6){
  j0 <- list(
    names = n1$lab1, 
    flags = n1$flag,
    threshold = 10000,
    colours = p,
    regions = a - 1,
    matrix = m[[i]],
    total_inflow = d3 %>%
      filter(method == x[i]) %>%
      rename(year = year0,
             dest = country) %>%
      select(year, dest, imm) %>%
      xtabs(formula = round(imm) ~ year + dest, data = .,) %>%
      array_tree(),
    total_outflow = d3 %>%
      filter(method == x[i]) %>%
      rename(year = year0,
             orig = country) %>%
      select(year, orig, emi) %>%
      xtabs(formula = round(emi) ~ year + orig, data = .,) %>%
      array_tree()
  )
  str(j0, max.level = 2)
  
  # convet list to json and save
  j1 <- toJSON(j0, auto_unbox = TRUE, pretty = TRUE, )
  write(x = j1, file = paste0("./json/flow_", x[i],".json"))
  
  # # check format
  # j <- read_json(path = paste0("./json/flow_", x[i],".json"), simplifyVector = TRUE )
  # str(j, max.level = 2)
}



# mm <- j$matrix$`1990`
# dimnames(mm) <- list(orig = j$names, dest = j$names)
# mm <- t(mm)
# mm[1:5,1:5]
# m %>% 
#   filter(orig == "SCG")
# m["SCG", ]


# # total checks for plot
# d3 %>%
#   filter(year0 == 2015, 
#          method == "da_pb_closed", 
#          country %in% c("United States", "Kenya", "East Asia"))